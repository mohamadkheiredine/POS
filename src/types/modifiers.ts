export type PopupModifierOption = {
  id: number;
  name: string;
  price: number;
};

export type PopupModifierGroup = {
  id: string;
  name: string;
  options: PopupModifierOption[];
};
