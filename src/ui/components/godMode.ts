import { getStateManager } from '../../core/stateManager';
import { getGeneratorManager } from '../../managers/generatorManager';
import { formatNumber } from '../../utils/numberUtils';

type GodAction = { label: string; run: () => void };

/**
 * Cheat panel: a small toggle in the bottom-left that opens buttons for
 * jumping bufos and multipliers straight up, so late-game numbers (e.g. the
 * Undecillion+ suffixes) can be reached without hours of play. Ships in every
 * build, unlike `window.debugTools`, which is development-only.
 *
 * Multiplier changes go through the same fields achievement rewards use
 * (`productionMultiplier` / `clickMultiplier`), so they're saved and persist
 * like any other bonus.
 */
export class GodMode {
  private panel: HTMLElement | null = null;
  private readout: HTMLElement | null = null;
  private toggle: HTMLElement | null = null;

  public init(): void {
    const root = document.createElement('div');
    root.className = 'god-mode';

    const toggle = document.createElement('button');
    toggle.className = 'god-mode__toggle';
    toggle.type = 'button';
    toggle.textContent = '⚡ God';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.addEventListener('click', () => this.setOpen(this.panel?.hidden ?? false));

    this.panel = document.createElement('div');
    this.panel.className = 'god-mode__panel';
    this.panel.hidden = true;

    this.readout = document.createElement('div');
    this.readout.className = 'god-mode__readout';
    this.panel.appendChild(this.readout);

    for (const action of this.actions()) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'god-mode__action';
      button.textContent = action.label;
      button.addEventListener('click', () => {
        action.run();
        this.refreshReadout();
      });
      this.panel.appendChild(button);
    }

    root.append(this.panel, toggle);
    document.body.appendChild(root);
    this.toggle = toggle;
  }

  private setOpen(open: boolean): void {
    if (!this.panel) return;
    this.panel.hidden = !open;
    this.toggle?.setAttribute('aria-expanded', String(open));
    if (open) this.refreshReadout();
  }

  private actions(): GodAction[] {
    return [
      { label: '+1 Decillion bufos', run: () => this.addBufos(1e33) },
      { label: 'Bufos ×1,000', run: () => this.addBufos(Math.max(getStateManager().getState().resources.bufos, 1_000) * 999) },
      { label: 'Jump to 1 Undecillion', run: () => this.setBufos(1e36) },
      { label: 'Production ×10', run: () => this.multiply('productionMultiplier', 10) },
      { label: 'Click power ×10', run: () => this.multiply('clickMultiplier', 10) },
      { label: 'Unlock all generators', run: () => this.unlockAllGenerators() },
    ];
  }

  private addBufos(amount: number): void {
    const { resources } = getStateManager().getState();
    getStateManager().setState({
      resources: {
        bufos: resources.bufos + amount,
        totalBufos: resources.totalBufos + amount,
      },
    });
  }

  private setBufos(amount: number): void {
    const { resources } = getStateManager().getState();
    getStateManager().setState({
      resources: {
        bufos: amount,
        totalBufos: Math.max(amount, resources.totalBufos),
      },
    });
  }

  private multiply(field: 'productionMultiplier' | 'clickMultiplier', factor: number): void {
    const { resources } = getStateManager().getState();
    getStateManager().setState({ resources: { [field]: resources[field] * factor } });
    // Production is cached per generator - same recalculation achievement
    // ProductionBoost rewards trigger.
    if (field === 'productionMultiplier') getGeneratorManager().recalculateAllGenerators();
  }

  private unlockAllGenerators(): void {
    const stateManager = getStateManager();
    for (const generator of getGeneratorManager().getAllGenerators()) {
      if (!generator.unlocked) {
        stateManager.setState({ generators: { [generator.id]: { unlocked: true, enabled: true } } });
      }
    }
  }

  private refreshReadout(): void {
    if (!this.readout) return;
    const { resources } = getStateManager().getState();
    this.readout.textContent =
      `Production ×${formatNumber(resources.productionMultiplier)} · Click ×${formatNumber(resources.clickMultiplier)}`;
  }
}
