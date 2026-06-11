"use client";

import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { Medication } from "@/lib/types";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function MedicationsPage() {
  const { user } = useAuth();
  const [medicationList, setMedicationList] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dosage, setDosage] = useState("");
  const [sideEffects, setSideEffects] = useState("");
  const [form, setForm] = useState("tablet");
  const [stockQuantity, setStockQuantity] = useState("0");
  const [stockUnit, setStockUnit] = useState("piece");

  useEffect(() => {
    if (user) {
      fetchMedications();
    }
  }, [user]);

  const fetchMedications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("medications")
      .select("*")
      .eq("patient_id", user?.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch medications", error);
    } else {
      setMedicationList(data || []);
    }
    setLoading(false);
  };

  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description || !dosage || !user) return;

    const newMedication = {
      patient_id: user.id,
      name,
      description,
      dosage,
      side_effects: sideEffects,
      form,
      stock_quantity: parseFloat(stockQuantity),
      stock_unit: stockUnit,
      is_active: true
    };

    const { data, error } = await supabase
      .from("medications")
      .insert([newMedication])
      .select()
      .single();

    if (error) {
      alert("Failed to add medication");
      console.error(error);
      return;
    }

    if (data) {
      setMedicationList([data as Medication, ...medicationList]);
    }
    
    setShowForm(false);
    setName("");
    setDescription("");
    setDosage("");
    setSideEffects("");
    setForm("tablet");
    setStockQuantity("0");
    setStockUnit("piece");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this medication?")) return;

    const { error } = await supabase.from("medications").delete().eq("id", id);
    
    if (error) {
      alert("Failed to delete");
      console.error(error);
      return;
    }

    setMedicationList(medicationList.filter((m) => m.id !== id));
  };

  if (!user) return null;

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-white text-gray-800">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Medication List</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={18} /> Add Medication
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleAddMedication} className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Medication Name</label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                placeholder="e.g. Paracetamol"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                required
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                placeholder="e.g. Fever, Headache"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dosage</label>
              <input
                required
                type="text"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                placeholder="e.g. 3x Daily"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Side Effects</label>
              <input
                type="text"
                value={sideEffects}
                onChange={(e) => setSideEffects(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                placeholder="e.g. Drowsiness"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Form</label>
              <select
                value={form}
                onChange={(e) => setForm(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
              >
                <option value="tablet">Tablet</option>
                <option value="capsule">Capsule</option>
                <option value="liquid">Liquid</option>
                <option value="drops">Drops</option>
                <option value="cream">Cream</option>
                <option value="injection">Injection</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
                <input
                  type="number"
                  step="0.01"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <select
                  value={stockUnit}
                  onChange={(e) => setStockUnit(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                >
                  <option value="piece">Piece</option>
                  <option value="ml">ML</option>
                  <option value="mg">MG</option>
                  <option value="drop">Drop</option>
                  <option value="puff">Puff</option>
                </select>
              </div>
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Save Medication
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="text-center text-gray-500 py-12">Loading medications...</div>
        ) : medicationList.length === 0 ? (
          <div className="text-center text-gray-500 py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            No medications recorded yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {medicationList.map((med) => (
              <div key={med.id} className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm hover:shadow-md transition relative group">
                <button
                  onClick={() => handleDelete(med.id)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 size={18} />
                </button>
                <h3 className="font-bold text-lg text-blue-900 mb-1">{med.name}</h3>
                <div className="text-sm text-gray-500 mb-3">{med.description}</div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Dosage:</span>
                    <span className="font-medium text-gray-800">{med.dosage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Form:</span>
                    <span className="font-medium text-gray-800 capitalize">{med.form}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Stock:</span>
                    <span className="font-medium text-gray-800">{med.stock_quantity} {med.stock_unit}</span>
                  </div>
                  {med.side_effects && (
                    <div className="flex flex-col gap-1 mt-2">
                      <span className="text-gray-500 text-xs uppercase font-semibold">Side Effects:</span>
                      <span className="text-gray-700 italic">{med.side_effects}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
