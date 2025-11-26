"use client";

import React, { useState } from "react";
import {
  PlusCircle,
  Trash2,
  FileDown,
  Save,
  Printer,
  Building2,
  Package,
  FileText,
  DollarSign,
} from "lucide-react";

export default function NewPurchaseOrderPage() {
  const [items, setItems] = useState([{ id: 1, name: "", quantity: 1, cost: 0, tax: 0 }]);
  const [supplier, setSupplier] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [poNumber, setPoNumber] = useState("PO-" + Date.now().toString().slice(-5));
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [discount, setDiscount] = useState(0);

  const addItem = () =>
    setItems([...items, { id: Date.now(), name: "", quantity: 1, cost: 0, tax: 0 }]);
  const removeItem = (id: number) => setItems(items.filter((i) => i.id !== id));
  const handleChange = (id: number, field: string, value: string | number) =>
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.cost, 0);
  const taxTotal = items.reduce(
    (sum, i) => sum + (i.quantity * i.cost * i.tax) / 100,
    0
  );
  const total = subtotal + taxTotal - discount;

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Package className="w-7 h-7 text-amber-500" /> New Purchase Order
          </h1>
          <div className="space-x-3">
            <button className="px-4 py-2 border rounded-md bg-white hover:bg-gray-50 text-gray-700 flex items-center gap-2">
              <FileDown className="w-4 h-4" /> Export
            </button>
            <button className="px-4 py-2 border rounded-md bg-white hover:bg-gray-50 text-gray-700 flex items-center gap-2">
              <Printer className="w-4 h-4" /> Print
            </button>
            <button className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2">
              <Save className="w-4 h-4" /> Save Order
            </button>
          </div>
        </div>

        {/* Supplier Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow p-6 border border-gray-200">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-700 mb-4">
            <Building2 className="w-5 h-5 text-amber-500" /> Supplier & Details
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-gray-600">Supplier</label>
              <input
                className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Supplier Name"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Warehouse</label>
              <input
                className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Warehouse Name"
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">PO Number</label>
              <input
                className="w-full border rounded-md p-2 bg-gray-100"
                value={poNumber}
                readOnly
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Date</label>
              <input
                type="date"
                className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Items Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-700">
              <FileText className="w-5 h-5 text-amber-500" /> Items List
            </h2>
            <button
              onClick={addItem}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-md"
            >
              <PlusCircle className="w-4 h-4" /> Add Item
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-t border-gray-100">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="p-2 text-left">Item Name</th>
                  <th className="p-2 text-right">Qty</th>
                  <th className="p-2 text-right">Unit Cost</th>
                  <th className="p-2 text-right">Tax %</th>
                  <th className="p-2 text-right">Total</th>
                  <th className="p-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b bg-white hover:bg-gray-50">
                    <td className="p-2">
                      <input
                        className="w-full border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="Item name"
                        value={item.name}
                        onChange={(e) =>
                          handleChange(item.id, "name", e.target.value)
                        }
                      />
                    </td>
                    <td className="p-2 text-right">
                      <input
                        type="number"
                        min="1"
                        className="w-20 border rounded-md p-2 text-right focus:outline-none focus:ring-2 focus:ring-amber-500"
                        value={item.quantity}
                        onChange={(e) =>
                          handleChange(item.id, "quantity", Number(e.target.value))
                        }
                      />
                    </td>
                    <td className="p-2 text-right">
                      <input
                        type="number"
                        min="0"
                        className="w-24 border rounded-md p-2 text-right focus:outline-none focus:ring-2 focus:ring-amber-500"
                        value={item.cost}
                        onChange={(e) =>
                          handleChange(item.id, "cost", Number(e.target.value))
                        }
                      />
                    </td>
                    <td className="p-2 text-right">
                      <input
                        type="number"
                        min="0"
                        className="w-20 border rounded-md p-2 text-right focus:outline-none focus:ring-2 focus:ring-amber-500"
                        value={item.tax}
                        onChange={(e) =>
                          handleChange(item.id, "tax", Number(e.target.value))
                        }
                      />
                    </td>
                    <td className="p-2 text-right font-semibold text-gray-700">
                      {(
                        item.quantity * item.cost +
                        (item.quantity * item.cost * item.tax) / 100
                      ).toFixed(2)}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow p-6 border border-gray-200 grid md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm text-gray-600">Notes</label>
            <textarea
              className="w-full border rounded-md p-3 h-32 focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Add additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-gray-700">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Tax:</span>
              <span>${taxTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Discount:</span>
              <input
                type="number"
                className="w-24 border rounded-md text-right p-1 focus:outline-none focus:ring-2 focus:ring-amber-500"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
              />
            </div>
            <div className="flex justify-between text-lg font-semibold border-t pt-2 text-gray-800">
              <span>Grand Total:</span>
              <span className="text-emerald-600">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}