import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DebugPanelComponent } from './debug-panel.component';
import { TreasureHuntService } from '../../services/treasure-hunt.service';
import { Step } from '../../models/step.model';
import { of } from 'rxjs';
import { CommonModule } from '@angular/common';

describe('DebugPanelComponent', () => {
  let component: DebugPanelComponent;
  let fixture: ComponentFixture<DebugPanelComponent>;
  let mockTreasureHuntService: jasmine.SpyObj<TreasureHuntService>;

  const mockSteps: Step[] = [
    { id: 1, title: 'Step 1', description: 'Desc 1', coordinates: { lat: 1, lng: 1 }, isUnlocked: false, isCurrent: true, isAccessible: true, canPostpone: true, icon: 'icon1', color: 'blue' },
    { id: 2, title: 'Step 2', description: 'Desc 2', coordinates: { lat: 2, lng: 2 }, isUnlocked: false, isCurrent: false, isAccessible: false, canPostpone: false, icon: 'icon2', color: 'red' },
    { id: 3, title: 'Step 3', description: 'Desc 3', coordinates: { lat: 3, lng: 3 }, isUnlocked: false, isCurrent: false, isAccessible: false, canPostpone: true, icon: 'icon3', color: 'green' },
  ];

  beforeEach(async () => {
    mockTreasureHuntService = jasmine.createSpyObj('TreasureHuntService', [
      'getSteps',
      'setCurrentStepById',
      'getCurrentCoordinates',
      'getCurrentDistance',
      'getDebugModeObservable',
      'getCurrentTrackingStep',
      'getCurrentActiveStep',
      'getCurrentStepElapsedTime',
      'getTotalElapsedTime',
      'getCompletedStepsCount',
      'getTotalStepsCount',
      'formatDuration',
      'toggleDebugMode',
      'simulateLocationReached',
      'resetHunt',
      'getUnlockRadius',
      'postponeStep'
    ]);

    // Provide default return values for methods called during ngOnInit
    mockTreasureHuntService.getDebugModeObservable.and.returnValue(of(true));
    mockTreasureHuntService.getCurrentCoordinates.and.returnValue(of({ lat: 0, lng: 0 }));
    mockTreasureHuntService.getCurrentDistance.and.returnValue(of(100));
    mockTreasureHuntService.getSteps.and.returnValue(of(mockSteps)); // Default for ngOnInit
    mockTreasureHuntService.getCurrentTrackingStep.and.returnValue(mockSteps[0]);
    mockTreasureHuntService.getCurrentActiveStep.and.returnValue(mockSteps[0]);
    mockTreasureHuntService.getCurrentStepElapsedTime.and.returnValue(0);
    mockTreasureHuntService.getTotalElapsedTime.and.returnValue(0);
    mockTreasureHuntService.getCompletedStepsCount.and.returnValue(0);
    mockTreasureHuntService.getTotalStepsCount.and.returnValue(mockSteps.length);
    mockTreasureHuntService.formatDuration.and.returnValue('0s');
    mockTreasureHuntService.getUnlockRadius.and.returnValue(5);


    await TestBed.configureTestingModule({
      imports: [DebugPanelComponent, CommonModule], // Import standalone component
      providers: [
        { provide: TreasureHuntService, useValue: mockTreasureHuntService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DebugPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // Trigger ngOnInit
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('getPostponableSteps', () => {
    it('should return only steps where canPostpone is true', (done) => {
      // Override the default getSteps mock for this specific test if needed,
      // or ensure the default mockSteps is suitable.
      // mockTreasureHuntService.getSteps.and.returnValue(of(mockSteps)); // Already set in beforeEach

      component.getPostponableSteps().subscribe(postponableSteps => {
        expect(postponableSteps.length).toBe(2);
        expect(postponableSteps.every(step => step.canPostpone === true)).toBeTrue();
        expect(postponableSteps.find(step => step.id === 1)).toBeTruthy();
        expect(postponableSteps.find(step => step.id === 3)).toBeTruthy();
        expect(postponableSteps.find(step => step.id === 2)).toBeFalsy();
        done();
      });
    });
  });

  describe('onPostponableStepClick', () => {
    let confirmSpy: jasmine.Spy;
    const testStep: Step = { id: 1, title: 'Test Step', description: 'Test Desc', coordinates: { lat: 1, lng: 1 }, isUnlocked: false, isCurrent: false, isAccessible: true, canPostpone: true, icon: 'test', color: 'test' };

    beforeEach(() => {
      confirmSpy = spyOn(window, 'confirm');
      // mockTreasureHuntService.setCurrentStepById is already a spy from createSpyObj
    });

    it('should call treasureHuntService.setCurrentStepById if user confirms', () => {
      confirmSpy.and.returnValue(true);
      component.onPostponableStepClick(testStep);
      expect(confirmSpy).toHaveBeenCalledWith("Êtes-vous sûr de vouloir faire de cette étape l'étape actuelle ?");
      expect(mockTreasureHuntService.setCurrentStepById).toHaveBeenCalledWith(testStep.id);
    });

    it('should NOT call treasureHuntService.setCurrentStepById if user cancels', () => {
      confirmSpy.and.returnValue(false);
      component.onPostponableStepClick(testStep);
      expect(confirmSpy).toHaveBeenCalledWith("Êtes-vous sûr de vouloir faire de cette étape l'étape actuelle ?");
      expect(mockTreasureHuntService.setCurrentStepById).not.toHaveBeenCalled();
    });
  });
});
