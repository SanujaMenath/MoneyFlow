import { LucideIcon } from "lucide-react";
import { useCurrency } from "../../../context/CurrencyContext";

interface StatsCardProps {
  title: string;
  amount: number;
  type?: "balance" | "income" | "expense";
  icon?: LucideIcon;
}

const StatsCard = ({ title, amount, type = "balance", icon: Icon }: StatsCardProps) => {

  const getTextColor = () => {
    if (type === "income") return "text-income";
    if (type === "expense") return "text-expense";
    return "text-text-primary"; 
  };

  const getSign = () => {
    if (type === "income") return "+";
    if (type === "expense") return "-";
    return "";
  };

  const { format } = useCurrency();

  return (
 
    <div className="bg-white p-4 sm:p-4 lg:p-5 rounded-2xl border border-border shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-text-secondary text-xs sm:text-sm font-medium truncate">
            {title}
          </p>
          
          <h3 className={`font-bold mt-1 lg:mt-3 truncate tracking-tight ${getTextColor()} text-base sm:text-sm lg:text-2xl`}>
            {getSign()}{format(amount)}
          </h3>
        </div>

        {Icon && (
          <div className="p-2 sm:p-3 bg-gray-50 rounded-xl shrink-0">
            <Icon className="text-text-secondary w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCard;