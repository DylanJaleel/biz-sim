/** Phones play in landscape: in portrait a full-screen hint asks to turn the device. */
export function RotateHint() {
  return (
    <div className="rotate" role="dialog" aria-label="Bitte drehen">
      <div className="rotate__phone" aria-hidden="true" />
      <p className="rotate__title">Bitte quer halten</p>
      <p className="rotate__text">Der Beirat tagt im Querformat. Dreh dein Handy, dann geht es weiter.</p>
    </div>
  );
}
