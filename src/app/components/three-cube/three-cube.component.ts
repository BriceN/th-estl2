import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  EventEmitter,
  Output,
  ChangeDetectionStrategy,
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AudioManagerService } from '../../services/audio-manager.service';

@Component({
  selector: 'app-three-cube',
  imports: [],
  templateUrl: './three-cube.component.html',
  styleUrl: './three-cube.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThreeCubeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('cubeContainer', { static: true }) cubeContainer!: ElementRef;
  @Output() cubeInteracted = new EventEmitter<void>();

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private cube!: THREE.Mesh;
  private button!: THREE.Mesh;
  private ring!: THREE.Mesh;
  private controls!: OrbitControls;
  private animationId!: number;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  // Effects objects
  private particles: THREE.Points[] = [];
  private orbitalRings: THREE.Line[] = [];
  private energyStreams: THREE.Mesh[] = [];
  private hologramPlanes: THREE.Mesh[] = [];

  // Propulsion state
  private isPropelled = false;
  private propulsionVelocity = new THREE.Vector3();
  private initialCubePosition = new THREE.Vector3();
  private cubeOpacity = 1;
  private propulsionSpeed = 0.1; // Reduced speed
  private fadeSpeed = 0.008; // Slower fade

  constructor(private audioManagerService: AudioManagerService) {}

  ngAfterViewInit() {
    this.initThreeJS();
    this.initControls();
    this.createLighting();
    this.createCube();
    this.createButton();
    this.createSciFiEffects();
    this.addEventListeners();
    this.animate();
    this.audioManagerService.stopAll();
    this.audioManagerService.play('pool_enter.wav', false, false, 0, 0.5);
    this.audioManagerService.play('EndTimes.mp3', true, true, 1000, 0.2);
  }

  ngOnDestroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.removeEventListeners();
    this.controls?.dispose();
    this.cleanup();
  }

  private initThreeJS() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x0a1929, 10, 50);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.cubeContainer.nativeElement.clientWidth /
        this.cubeContainer.nativeElement.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 2, 8);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(
      this.cubeContainer.nativeElement.clientWidth,
      this.cubeContainer.nativeElement.clientHeight
    );
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.cubeContainer.nativeElement.appendChild(this.renderer.domElement);
  }

  private initControls() {
    // Initialize OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // Configure controls
    this.controls.target.set(0, 0, 0); // Look at the center where the cube is
    this.controls.enableDamping = true; // Smooth camera movements
    this.controls.dampingFactor = 0.05;

    // Set limits for zoom
    this.controls.minDistance = 3; // Minimum zoom distance
    this.controls.maxDistance = 20; // Maximum zoom distance

    // Set limits for vertical rotation (prevent going under the ground)
    this.controls.maxPolarAngle = Math.PI; // Allow full vertical rotation
    this.controls.minPolarAngle = 0;

    // Enable/disable various controls
    this.controls.enableZoom = true;
    this.controls.enableRotate = true;
    this.controls.enablePan = false; // Disable panning to keep focus on cube

    // Set rotation speed
    this.controls.rotateSpeed = 0.5;
    this.controls.zoomSpeed = 1.2;

    // Update controls once to set initial state
    this.controls.update();
  }

  private createLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x16a2ff, 0.3);
    this.scene.add(ambientLight);

    // Main directional light
    const mainLight = new THREE.DirectionalLight(0x8adbff, 1);
    mainLight.position.set(5, 5, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    this.scene.add(mainLight);

    // Accent lights for glow effects
    const accentLight1 = new THREE.PointLight(0x00ff9d, 2, 20);
    accentLight1.position.set(-3, 3, 3);
    this.scene.add(accentLight1);

    const accentLight2 = new THREE.PointLight(0xd644ff, 2, 20);
    accentLight2.position.set(3, -2, 4);
    this.scene.add(accentLight2);

    // Flickering energy light
    const energyLight = new THREE.PointLight(0x16a2ff, 1, 15);
    energyLight.position.set(0, 4, 0);
    this.scene.add(energyLight);

    // Add flickering animation to energy light
    const originalIntensity = energyLight.intensity;
    setInterval(() => {
      energyLight.intensity = originalIntensity * (0.8 + Math.random() * 0.4);
    }, 100);
  }

  private createCube() {
    // Create cube geometry
    const geometry = new THREE.BoxGeometry(2, 2, 2);

    // Create materials for each face
    const materials: any[] = [];
    const faceColors = [
      0x151e2d, // Right face (where button will be)
      0x0d1420, // Left face
      0x1a2332, // Top face
      0x0f1722, // Bottom face
      0x121c29, // Front face
      0x101b26, // Back face
    ];

    faceColors.forEach((color, index) => {
      const material = new THREE.MeshPhongMaterial({
        color: color,
        shininess: 100,
        specular: 0x16a2ff,
        transparent: true,
        opacity: 1,
      });

      // Add glow shader for the face with the button
      if (index === 0) {
        material.emissive = new THREE.Color(0x001a2e);
        material.emissiveIntensity = 0.3;
      }

      materials.push(material);
    });

    this.cube = new THREE.Mesh(geometry, materials);
    this.cube.castShadow = true;
    this.cube.receiveShadow = true;
    this.scene.add(this.cube);

    // Store initial position
    this.initialCubePosition.copy(this.cube.position);

    // Add edge glow
    const edgeGeometry = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0x16a2ff,
      transparent: true,
      opacity: 0.6,
      linewidth: 2,
    });
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    this.cube.add(edges);
  }

  private createButton() {
    // Button geometry
    const buttonGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 16);

    // Button material with glow effect
    const buttonMaterial = new THREE.MeshPhongMaterial({
      color: 0x00ff9d,
      emissive: 0x004d2e,
      emissiveIntensity: 0.5,
      shininess: 100,
      transparent: true,
      opacity: 0.9,
    });

    this.button = new THREE.Mesh(buttonGeometry, buttonMaterial);
    this.button.position.set(1.05, 0, 0); // On the right face of the cube
    this.button.rotation.z = Math.PI / 2; // Rotate to face outward
    this.button.userData = { clickable: true };
    this.scene.add(this.button);

    // Add button glow ring
    const ringGeometry = new THREE.RingGeometry(0.18, 0.25, 16);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff9d,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    this.ring = new THREE.Mesh(ringGeometry, ringMaterial);
    this.ring.position.copy(this.button.position);
    this.ring.position.x += 0.01; // Slightly offset from cube face
    this.ring.rotation.y = Math.PI / 2; // Face outward from the right face

    this.scene.add(this.ring);

    // Animate button glow
    let glowIntensity = 0;
    const animateButtonGlow = () => {
      glowIntensity += 0.02;
      buttonMaterial.emissiveIntensity = 0.5 + Math.sin(glowIntensity) * 0.3;
      ringMaterial.opacity = 0.3 + Math.sin(glowIntensity * 1.5) * 0.2;
      requestAnimationFrame(animateButtonGlow);
    };
    animateButtonGlow();
  }

  private createSciFiEffects() {
    this.createParticles();
    this.createOrbitalRings();
    this.createEnergyStreams();
    // this.createHologramPlanes();
  }

  private createParticles() {
    // Floating particles around the cube
    const particleCount = 100;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);

    const colorOptions = [
      new THREE.Color(0x16a2ff),
      new THREE.Color(0x00ff9d),
      new THREE.Color(0xd644ff),
      new THREE.Color(0x8adbff),
    ];

    for (let i = 0; i < particleCount; i++) {
      // Random position in sphere around cube
      const radius = 5 + Math.random() * 10;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      // Random color
      const color =
        colorOptions[Math.floor(Math.random() * colorOptions.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      scales[i] = Math.random() * 2 + 1;
    }

    particleGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );
    particleGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(colors, 3)
    );
    particleGeometry.setAttribute(
      'scale',
      new THREE.BufferAttribute(scales, 1)
    );

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      alphaTest: 0.001,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    this.particles.push(particles);
    this.scene.add(particles);
  }

  private createOrbitalRings() {
    // Create multiple orbital rings around the cube
    const ringCount = 3;
    const ringGeometry = new THREE.RingGeometry(3, 3.02, 64);

    for (let i = 0; i < ringCount; i++) {
      const ringMaterial = new THREE.LineBasicMaterial({
        color: i === 0 ? 0x16a2ff : i === 1 ? 0x00ff9d : 0xd644ff,
        transparent: true,
        opacity: 0.4,
        linewidth: 1,
      });

      const ring = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(
          new Array(65).fill(0).map((_, j) => {
            const angle = (j / 64) * Math.PI * 2;
            const radius = 3 + i * 0.5;
            return new THREE.Vector3(
              Math.cos(angle) * radius,
              Math.sin(angle) * radius,
              0
            );
          })
        ),
        ringMaterial
      );

      // Random rotation for each ring
      ring.rotation.x = Math.random() * Math.PI;
      ring.rotation.y = Math.random() * Math.PI;
      ring.rotation.z = Math.random() * Math.PI;

      this.orbitalRings.push(ring);
      this.scene.add(ring);
    }
  }

  private createEnergyStreams() {
    // Create flowing energy streams between points
    const streamCount = 2;

    for (let i = 0; i < streamCount; i++) {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-5, -2, -3),
        new THREE.Vector3(-1, 3, 1),
        new THREE.Vector3(2, -1, 4),
        new THREE.Vector3(5, 2, -2),
      ]);

      const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.02, 8, false);
      const tubeMaterial = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x16a2ff : 0x00ff9d,
        transparent: true,
        opacity: 0.7,
        // emissive: i % 2 === 0 ? 0x001a33 : 0x001a1a,
        // emissiveIntensity: 0.5,
      });

      const stream = new THREE.Mesh(tubeGeometry, tubeMaterial);
      stream.rotation.y = (i / streamCount) * Math.PI * 2;
      stream.rotation.x = Math.random() * Math.PI * 0.5;

      this.energyStreams.push(stream);
      this.scene.add(stream);
    }
  }

  private createHologramPlanes() {
    // Create translucent holographic planes with circuit patterns
    const planeCount = 2;

    for (let i = 0; i < planeCount; i++) {
      const planeGeometry = new THREE.PlaneGeometry(6, 4, 32, 32);
      const planeMaterial = new THREE.MeshBasicMaterial({
        color: 0x16a2ff,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide,
        alphaTest: 0.001,
        blending: THREE.AdditiveBlending,
      });

      const plane = new THREE.Mesh(planeGeometry, planeMaterial);
      plane.position.set(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 10
      );
      plane.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      this.hologramPlanes.push(plane);
      this.scene.add(plane);
    }
  }

  private addEventListeners() {
    this.renderer.domElement.addEventListener(
      'click',
      this.onMouseClick.bind(this)
    );
    this.renderer.domElement.addEventListener(
      'mousemove',
      this.onMouseMove.bind(this)
    );
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private removeEventListeners() {
    this.renderer.domElement.removeEventListener(
      'click',
      this.onMouseClick.bind(this)
    );
    this.renderer.domElement.removeEventListener(
      'mousemove',
      this.onMouseMove.bind(this)
    );
    window.removeEventListener('resize', this.onWindowResize.bind(this));
  }

  private onMouseClick(event: MouseEvent) {
    // Only process click if it's not a drag operation from orbit controls
    if (this.controls.getDistance() === this.controls.getDistance()) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObject(this.button);

      if (intersects.length > 0) {
        // Button clicked - trigger animation and emit event
        this.onButtonClick();
      }
    }
  }

  private onMouseMove(event: MouseEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.button);

    // Change cursor on hover
    if (intersects.length > 0) {
      this.renderer.domElement.style.cursor = 'pointer';
      // Enhance button glow on hover
      (this.button.material as THREE.MeshPhongMaterial).emissiveIntensity = 0.8;
    } else {
      this.renderer.domElement.style.cursor = 'default';
      (this.button.material as THREE.MeshPhongMaterial).emissiveIntensity = 0.5;
    }
  }

  private onButtonClick() {
    // Don't start new propulsion if one is already in progress
    if (this.isPropelled) return;

    // Create explosion effect
    this.createExplosionEffect();

    this.audioManagerService.play('boom.wav');

    // Start cube propulsion
    this.startCubePropulsion();

    // Vibrate if supported
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }

    setTimeout(() => {
      this.cubeInteracted.emit();
    }, 3000);
  }

  private startCubePropulsion() {
    // Get camera forward direction (to move away from camera)
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);

    // Set the propulsion velocity in the same direction as camera's view (away from camera)
    this.propulsionVelocity.copy(
      cameraDirection.multiplyScalar(this.propulsionSpeed)
    );

    // Add some randomness to make it more dynamic
    this.propulsionVelocity.add(
      new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1
      )
    );

    // Start the propulsion state
    this.isPropelled = true;
    this.cubeOpacity = 1;
  }

  private updateCubePropulsion() {
    if (!this.isPropelled) return;

    // Move the cube
    this.cube.position.add(this.propulsionVelocity);

    // Accelerate the cube more gradually
    this.propulsionVelocity.multiplyScalar(1.02); // Reduced acceleration

    // Add some rotation for visual effect
    this.cube.rotation.x += 0.05; // Slower rotation
    this.cube.rotation.y += 0.04;
    this.cube.rotation.z += 0.03;

    // Fade out the cube
    this.cubeOpacity -= this.fadeSpeed;
    this.cubeOpacity = Math.max(0, this.cubeOpacity);

    // Update materials opacity
    const materials = this.cube.material as THREE.MeshPhongMaterial[];
    materials.forEach((material) => {
      material.opacity = this.cubeOpacity;
    });
    (this.ring.material as THREE.MeshPhongMaterial).opacity = 0;

    // Also move and fade the button with the cube
    this.button.position.copy(this.cube.position);
    this.button.position.x += 1.05; // Maintain relative position
    (this.button.material as THREE.MeshPhongMaterial).opacity =
      this.cubeOpacity * 0.9;

    // Don't reset the cube - let it disappear permanently
    if (this.cubeOpacity <= 0) {
      this.isPropelled = false; // Stop the propulsion animation
    }
  }

  private createExplosionEffect() {
    const explosionGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const explosionMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff9d,
      transparent: true,
      opacity: 1,
    });

    const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
    explosion.position.copy(this.button.position);
    this.scene.add(explosion);

    // Animate explosion
    let scale = 1;
    let opacity = 1;
    const animateExplosion = () => {
      scale += 0.3;
      opacity -= 0.02;

      explosion.scale.setScalar(scale);
      explosionMaterial.opacity = opacity;

      if (opacity > 0) {
        requestAnimationFrame(animateExplosion);
      } else {
        this.scene.remove(explosion);
        explosionGeometry.dispose();
        explosionMaterial.dispose();
      }
    };
    animateExplosion();
  }

  private onWindowResize() {
    const width = this.cubeContainer.nativeElement.clientWidth;
    const height = this.cubeContainer.nativeElement.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Update controls on resize
    this.controls.update();
  }

  private animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    const time = Date.now() * 0.001;

    // Update cube propulsion if active
    this.updateCubePropulsion();

    // Update orbit controls for smooth camera movement
    this.controls.update();

    // Animate orbital rings
    this.orbitalRings.forEach((ring, index) => {
      ring.rotation.z += 0.01 * (index + 1);
      ring.rotation.y += 0.005 * (index + 1);
    });

    // Animate particles
    this.particles.forEach((particle) => {
      particle.rotation.y += 0.002;

      // Gentle floating motion
      const positions = particle.geometry.attributes['position']
        .array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += Math.sin(time * 2 + i) * 0.001;
      }
      particle.geometry.attributes['position'].needsUpdate = true;
    });

    // Animate energy streams
    this.energyStreams.forEach((stream, index) => {
      stream.rotation.y += 0.01 * (index + 1);
      stream.rotation.z += 0.005;

      const material = stream.material as THREE.MeshBasicMaterial;
      material.opacity = 0.7 + Math.sin(time * 3 + index) * 0.3;
    });

    // Animate hologram planes
    this.hologramPlanes.forEach((plane, index) => {
      plane.rotation.y += 0.002 * (index + 1);
      plane.rotation.x += 0.001;

      const material = plane.material as THREE.MeshBasicMaterial;
      material.opacity = 0.1 + Math.sin(time * 2 + index * 2) * 0.05;
    });

    this.renderer.render(this.scene, this.camera);
  }

  private cleanup() {
    // Dispose of geometries and materials
    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((material) => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });

    // Clear arrays
    this.particles = [];
    this.orbitalRings = [];
    this.energyStreams = [];
    this.hologramPlanes = [];

    // Dispose controls
    if (this.controls) {
      this.controls.dispose();
    }

    // Dispose renderer
    this.renderer.dispose();
  }
}
