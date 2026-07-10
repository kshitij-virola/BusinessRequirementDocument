// Prisma maps Postgres bigint columns to JS BigInt, which JSON.stringify (and thus
// res.json()) cannot serialize on its own. Values here (byte counts) are always well
// within Number.MAX_SAFE_INTEGER, so converting to Number is safe.
declare global {
  interface BigInt {
    toJSON(): number
  }
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
;(BigInt.prototype as any).toJSON = function (this: bigint) {
  return Number(this)
}

export {}
