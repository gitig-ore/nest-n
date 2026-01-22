"use client";

import React from 'react';

export default function Button({ children, className = '', ...props }: any) {
  return (
    <button
      {...props}
      className={
        'inline-flex items-center justify-center rounded-md bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 disabled:opacity-60 ' +
        className
      }
    >
      {children}
    </button>
  );
}
