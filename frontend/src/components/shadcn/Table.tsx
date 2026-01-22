"use client";

import React from 'react';

export function Table({ children }: { children: React.ReactNode }) {
  return <table className="w-full table-auto border-collapse">{children}</table>;
}

export function THead({ children }: { children: React.ReactNode }) {
  return <thead className="bg-gray-50">{children}</thead>;
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TR({ children }: { children: React.ReactNode }) {
  return <tr className="border-b">{children}</tr>;
}

export function TH({ children }: { children: React.ReactNode }) {
  return <th className="py-2 text-left">{children}</th>;
}

export function TD({ children }: { children: React.ReactNode }) {
  return <td className="py-2">{children}</td>;
}
