"use client";

import React from 'react';

const Input = React.forwardRef(function Input(props: any, ref: any) {
  return (
    <input
      {...props}
      ref={ref}
      className={
        'w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-100 text-black ' +
        (props.className || '')
      }
    />
  );
});

export default Input;
