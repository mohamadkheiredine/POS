import { components, MenuListProps } from "react-select";

export function SearchableMenuList(props: MenuListProps<any>) {
  const {
    selectProps: { inputValue = "", onInputChange },
  } = props;

  return (
    <components.MenuList {...props}>
      <div className="px-3 pb-2">
        <input
          type="text"
          placeholder="Search..."
          value={inputValue}
          onChange={(e) => {
            onInputChange?.(e.target.value, {
              action: "input-change",
              prevInputValue: inputValue,
            });
          }}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {props.children}
    </components.MenuList>
  );
}
