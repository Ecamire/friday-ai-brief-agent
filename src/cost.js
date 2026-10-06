

const BUDGET_USD = parseFloat(process.env.RUN_BUDGET_USD || "1.00");

const OPUS_IN_PER_M = parseFloat(process.env.OPUS_IN_PER_M || "5");
const OPUS_OUT_PER_M = parseFloat(process.env.OPUS_OUT_PER_M || "25");

const IMAGE_PRICE = {
  "1024x1024": parseFloat(process.env.IMG_SQ_PRICE || "0.04"),
  "1536x1024": parseFloat(process.env.IMG_WIDE_PRICE || "0.06"),
  "1024x1536": parseFloat(process.env.IMG_TALL_PRICE || "0.06"),
};
const IMAGE_PRICE_DEFAULT = 0.06;

export function imageCost(size) {
  return IMAGE_PRICE[size] ?? IMAGE_PRICE_DEFAULT;
}

export function messageCost(usage = {}) {
  const inTok = usage.input_tokens || 0;
  const outTok = usage.output_tokens || 0; // includes thinking tokens
  return (inTok / 1e6) * OPUS_IN_PER_M + (outTok / 1e6) * OPUS_OUT_PER_M;
}

export function makeBudget(limit = BUDGET_USD) {
  let spent = 0;
  return {
    limit,
    spent: () => spent,
    remaining: () => Math.max(0, limit - spent),
    add(amount, label) {
      spent += amount;
      console.log(
        `   $ ${label}: +$${amount.toFixed(3)}  (run total $${spent.toFixed(3)} / $${limit.toFixed(2)})`,
      );
      return spent;
    },

    canAfford(amount, margin = 0.02) {
      return spent + amount + margin <= limit;
    },
  };
}
