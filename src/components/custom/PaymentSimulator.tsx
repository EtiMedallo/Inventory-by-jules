'use client'

import React, { useState } from 'react'

type PaymentSimulatorProps = {
  basePrice: number
  discountRules?: { min_down_payment_percent: number; discount_percent: number }[]
}

export default function PaymentSimulator({ basePrice, discountRules = [] }: PaymentSimulatorProps) {
  const [downPaymentPercent, setDownPaymentPercent] = useState<number>(30)
  const [termMonths, setTermMonths] = useState<number>(24)

  // Derived state (no useEffect needed)
  let applicableDiscount = 0
  if (discountRules && discountRules.length > 0) {
     const validRules = discountRules.filter(r => downPaymentPercent >= r.min_down_payment_percent)
     if (validRules.length > 0) {
        applicableDiscount = Math.max(...validRules.map(r => r.discount_percent))
     }
  }

  const finalPrice = basePrice * (1 - applicableDiscount / 100)
  const downPaymentAmount = finalPrice * (downPaymentPercent / 100)
  const financedAmount = finalPrice - downPaymentAmount
  const monthlyInstallment = termMonths > 0 ? financedAmount / termMonths : 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-indigo-600 px-4 py-3 text-white">
        <h3 className="font-semibold text-sm">Payment Simulator</h3>
      </div>

      <div className="p-4 space-y-5">
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">Down Payment ({downPaymentPercent}%)</label>
            <span className="text-sm font-semibold text-indigo-600">${Math.round(downPaymentAmount).toLocaleString()}</span>
          </div>
          <input
            type="range"
            min="10" max="100" step="5"
            value={downPaymentPercent}
            onChange={(e) => setDownPaymentPercent(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">Installments ({termMonths} months)</label>
          </div>
          <input
            type="range"
            min="1" max="60" step="1"
            value={termMonths}
            onChange={(e) => setTermMonths(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>

        <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
           {applicableDiscount > 0 && (
             <div className="col-span-2 bg-green-50 p-2 rounded flex justify-between text-sm">
                <span className="text-green-700 font-medium">Discount Applied ({applicableDiscount}%)</span>
                <span className="text-green-700 font-bold">-${Math.round(basePrice * (applicableDiscount/100)).toLocaleString()}</span>
             </div>
           )}

           <div>
              <p className="text-xs text-gray-500 uppercase">Final Price</p>
              <p className="text-lg font-bold text-gray-900">${Math.round(finalPrice).toLocaleString()}</p>
           </div>
           <div>
              <p className="text-xs text-gray-500 uppercase text-indigo-600 font-semibold">Monthly Payment</p>
              <p className="text-xl font-bold text-indigo-600">${Math.round(monthlyInstallment).toLocaleString()}</p>
           </div>
        </div>
      </div>
    </div>
  )
}