import { buyProperty, estateMonth, renovateProperty, sellProperty } from "./estate";
import { chooseHeir, decideCouncil, dynastyMonth, handover, mentor, setStrategy, signCharter } from "./dynasty";
import { foundationMonth, foundFoundation, giveFoundation, managedAssets, recordLegacy } from "./legacy";
import type { Ctx } from "./mna-core";
import type { IncomeLines } from "./types";
import type { WealthAction } from "./wealth-types";

// Vermögen und Vermächtnis an einer Stelle: die Engine ruft nur playWealth
// für die Züge und wealthMonth beim Monatsabschluss.

export function playWealth(ctx: Ctx, action: WealthAction): void {
  switch (action.type) {
    case "estate":
      if (action.move === "buy") buyProperty(ctx, action.offerId, action.ltv, action.binding);
      else if (action.move === "sell") sellProperty(ctx, action.propertyId);
      else renovateProperty(ctx, action.propertyId);
      return;
    case "foundation":
      if (action.move === "found") foundFoundation(ctx, action.amount, action.purpose);
      else giveFoundation(ctx, action.amount);
      return;
    case "dynasty":
      switch (action.move) {
        case "choose":
          return chooseHeir(ctx, action.heir);
        case "mentor":
          return mentor(ctx);
        case "charter":
          return signCharter(ctx, action.article);
        case "council":
          return decideCouncil(ctx, action.choice);
        case "handover":
          return handover(ctx);
        case "strategy":
          return setStrategy(ctx, action.strategy);
      }
  }
}

/** Property, foundation, family and the legacy chart: once per month close, before the stock market moves. */
export function wealthMonth(ctx: Ctx, month: number, income: IncomeLines, notes: string[]): void {
  estateMonth(ctx, month, income, notes);
  foundationMonth(ctx, month, income, notes);
  dynastyMonth(ctx, month, income, notes);
  const worth = ctx.worth();
  recordLegacy(ctx.state, month + 1, worth);
  const aum = managedAssets(ctx.state, worth).total;
  if (aum > (ctx.state.wealth?.aumPeak ?? 0)) {
    ctx.state.wealth = ctx.state.wealth ?? {};
    ctx.state.wealth.aumPeak = Math.round(aum);
  }
}
