"use client";

import React from 'react';

export default function Select(props: any) {
  return (
    <select
      {...props}
      className={
        'w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ' +
        (props.className || '')
      }
    >
      {props.children}
    </select>
  );
}
