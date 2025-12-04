import {
  Building2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Trash2,
  User,
} from "lucide-react";
type UID = number;
type CustomerType = "Dine-in" | "Takeaway" | "Delivery";

type Customer = {
  id: UID;
  accountNumber?: number;
  customerCode?: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  type: CustomerType;
  company?: string;
  loyaltyPoints?: number;
  active: number;
  website: string;
  hobbies: string;
  birthDate: string;
  favoriteFoods?: string;
  workTitle?: string;
  sports?: string;
};

interface Props {
  customer: Customer;
  startEdit: (c: Customer) => void;
  deleteCustomer: (id: number) => void;
}

export default function CustomerCard({
  customer: c,
  startEdit,
  deleteCustomer,
}: Props) {
  return (
    <div
      key={c.id}
      className="overflow-hidden rounded-3xl bg-white/80 backdrop-blur-xl ring-1 ring-white/60 shadow-sm p-4 flex flex-col justify-between"
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-base font-extrabold text-gray-900 flex items-center gap-1">
              <User className="h-4 w-4 text-gray-500" /> {c.name}
            </div>
            <div className="text-xs text-gray-500">{c.type}</div>
          </div>
          <button
            onClick={() => startEdit(c)}
            className="rounded-lg border border-gray-200 bg-white p-1 text-xs hover:bg-gray-50"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-1 text-sm text-gray-700">
          {c.phone && (
            <div className="flex items-center gap-1">
              <Phone className="h-4 w-4 text-gray-400" />
              {c.phone}
            </div>
          )}
          {c.email && (
            <div className="flex items-center gap-1">
              <Mail className="h-4 w-4 text-gray-400" />
              {c.email}
            </div>
          )}
          {c.address && (
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span className="truncate">{c.address}</span>
            </div>
          )}
        </div>

        {c.company && (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <Building2 className="h-3.5 w-3.5 text-gray-400" /> {c.company}
          </div>
        )}

        {c.loyaltyPoints !== undefined && (
          <div className="mt-1 text-[11px] font-semibold text-orange-600">
            {c.loyaltyPoints} pts
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
            c.active
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : "bg-gray-50 text-gray-600 ring-gray-200"
          }`}
        >
          {c.active === 1 ? "Active" : "Inactive"}
        </div>

        <button
          onClick={() => deleteCustomer(c.id)}
          className="rounded-lg border border-gray-200 bg-white p-1 text-xs hover:bg-gray-50"
        >
          <Trash2 className="h-4 w-4 text-gray-500" />
        </button>
      </div>
    </div>
  );
}
