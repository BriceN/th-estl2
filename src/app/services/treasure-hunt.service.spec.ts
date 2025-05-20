import { TestBed } from '@angular/core/testing';
import { TreasureHuntService } from './treasure-hunt.service';
import { Step } from '../models/step.model';
import { BehaviorSubject } from 'rxjs';

// Minimal initialStepsData mock for service initialization
const mockInitialStepsData: Step[] = [
  { id: 1, title: 'Initial Step 1', description: 'Desc 1', coordinates: { lat: 1, lng: 1 }, isUnlocked: false, isCurrent: false, isAccessible: true, canPostpone: false, icon: 'icon1', color: 'blue' },
  { id: 2, title: 'Initial Step 2', description: 'Desc 2', coordinates: { lat: 2, lng: 2 }, isUnlocked: false, isCurrent: false, isAccessible: false, canPostpone: true, icon: 'icon2', color: 'red' },
];

// Mock localStorage
let store: { [key: string]: string } = {};
const mockLocalStorage = {
  getItem: (key: string): string | null => {
    return key in store ? store[key] : null;
  },
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    store = {};
  }
};

describe('TreasureHuntService', () => {
  let service: TreasureHuntService;
  // @ts-ignore: Hack to access private properties for testing
  let stepsProperty: Step[];
  // @ts-ignore: Hack to access private properties for testing
  let trackingStepIndexProperty: number;
  // @ts-ignore: Hack to access private properties for testing
  let viewingStepIndexProperty: number;
  // @ts-ignore: Hack to access private properties for testing
  let stepsSubjectProperty: BehaviorSubject<Step[]>;

  const sampleSteps: Step[] = [
    { id: 10, title: 'Test Step 10', description: 'Desc 10', coordinates: { lat: 10, lng: 10 }, isUnlocked: false, isCurrent: true, isAccessible: true, canPostpone: true, icon: 'icon10', color: 'blue' },
    { id: 20, title: 'Test Step 20', description: 'Desc 20', coordinates: { lat: 20, lng: 20 }, isUnlocked: false, isCurrent: false, isAccessible: false, canPostpone: false, icon: 'icon20', color: 'red' },
    { id: 30, title: 'Test Step 30', description: 'Desc 30', coordinates: { lat: 30, lng: 30 }, isUnlocked: false, isCurrent: false, isAccessible: false, canPostpone: true, icon: 'icon30', color: 'green' },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TreasureHuntService]
    });

    // Mock initialStepsData from '../models/steps.data'
    // @ts-ignore: Hack to modify module-level variable for testing
    global.initialStepsData = [...mockInitialStepsData];


    spyOn(localStorage, 'getItem').and.callFake(mockLocalStorage.getItem);
    spyOn(localStorage, 'setItem').and.callFake(mockLocalStorage.setItem);
    spyOn(localStorage, 'removeItem').and.callFake(mockLocalStorage.removeItem);
    spyOn(localStorage, 'clear').and.callFake(mockLocalStorage.clear);
    store = {}; // Reset store for each test

    // Prevent location tracking interval from running during tests
    spyOn(window, 'setInterval').and.callFake(() => 0 as any); // Cast to any to satisfy TimerHandler

    service = TestBed.inject(TreasureHuntService);

    // Manually set the internal steps array for testing specific methods
    // @ts-ignore: Hack to access private properties for testing
    service.steps = JSON.parse(JSON.stringify(sampleSteps)); // Use a deep copy
    // @ts-ignore: Hack to access private properties for testing
    stepsProperty = service.steps;
    // @ts-ignore: Hack to access private properties for testing
    service.trackingStepIndex = 0; // Default for tests
    // @ts-ignore: Hack to access private properties for testing
    trackingStepIndexProperty = service.trackingStepIndex;
    // @ts-ignore: Hack to access private properties for testing
    service.viewingStepIndex = 0; // Default for tests
    // @ts-ignore: Hack to access private properties for testing
    viewingStepIndexProperty = service.viewingStepIndex;
    // @ts-ignore: Hack to access private properties for testing
    stepsSubjectProperty = service.stepsSubject;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('setCurrentStepById', () => {
    let updateStepStatusSpy: jasmine.Spy;
    let saveStateSpy: jasmine.Spy;
    let stepsSubjectNextSpy: jasmine.Spy;
    let consoleWarnSpy: jasmine.Spy;

    beforeEach(() => {
      // @ts-ignore: Spying on private method
      updateStepStatusSpy = spyOn(service, 'updateStepStatus').and.callThrough();
      // @ts-ignore: Spying on private method
      saveStateSpy = spyOn(service, 'saveState').and.callThrough();
      stepsSubjectNextSpy = spyOn(stepsSubjectProperty, 'next').and.callThrough();
      consoleWarnSpy = spyOn(console, 'warn');

      // Reset internal steps to a known state before each test in this describe block
      // @ts-ignore: Hack to access private properties for testing
      service.steps = JSON.parse(JSON.stringify(sampleSteps));
      // @ts-ignore: Hack to access private properties for testing
      service.trackingStepIndex = 0;
      // @ts-ignore: Hack to access private properties for testing
      service.viewingStepIndex = 0;
    });

    it('should set tracking and viewing index, and call relevant methods for a valid stepId', () => {
      const targetStepId = 20; // ID of the second step in sampleSteps
      const targetStepIndex = 1; // Expected index of step with ID 20

      service.setCurrentStepById(targetStepId);

      // @ts-ignore: Hack to access private properties for testing
      expect(service.trackingStepIndex).toBe(targetStepIndex);
      // @ts-ignore: Hack to access private properties for testing
      expect(service.viewingStepIndex).toBe(targetStepIndex);
      expect(updateStepStatusSpy).toHaveBeenCalled();
      expect(saveStateSpy).toHaveBeenCalled();
      expect(stepsSubjectNextSpy).toHaveBeenCalledWith(jasmine.any(Array)); // Checks if it's called with an array
      expect(stepsSubjectNextSpy.calls.mostRecent().args[0].length).toBe(sampleSteps.length);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should not change indices or call methods for an invalid stepId, and should warn', () => {
      const invalidStepId = 999;
      // @ts-ignore: Hack to access private properties for testing
      const initialTrackingIndex = service.trackingStepIndex;
      // @ts-ignore: Hack to access private properties for testing
      const initialViewingIndex = service.viewingStepIndex;


      service.setCurrentStepById(invalidStepId);

      // @ts-ignore: Hack to access private properties for testing
      expect(service.trackingStepIndex).toBe(initialTrackingIndex);
      // @ts-ignore: Hack to access private properties for testing
      expect(service.viewingStepIndex).toBe(initialViewingIndex);
      expect(updateStepStatusSpy).not.toHaveBeenCalled();
      expect(saveStateSpy).not.toHaveBeenCalled();
      expect(stepsSubjectNextSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(`Step with ID ${invalidStepId} not found.`);
    });
  });
});
