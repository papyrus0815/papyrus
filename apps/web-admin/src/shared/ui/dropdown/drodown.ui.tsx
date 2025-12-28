import React, { useState } from 'react';
import styles from './dropdown.ui.module.scss';

interface DropdownProps {
  options: { id: number; name: string }[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

function Dropdown({ options, selectedId, onSelect }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOptionClick = (id: number) => {
    onSelect(id);
    setIsOpen(false);
  };

  return (
    <div className={styles.dropdown}>
      <button
        className={styles.dropdownButton}
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedId
          ? options.find((option) => option.id === selectedId)?.name
          : '대륙 선택'}
        <svg
          className={`${styles.arrowIcon} ${isOpen ? styles.open : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M6.293 9.293a1 1 0 011.414 0L10 11.586l2.293-2.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {isOpen && (
        <ul className={styles.dropdownList}>
          {options.map((option) => (
            <li
              key={option.id}
              className={styles.dropdownItem}
              onClick={() => handleOptionClick(option.id)}
            >
              {option.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Dropdown;
