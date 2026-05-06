import { createContext } from "react";

/** @typedef {{ id: string, category: string, title: string, subtitle: string, price: number, rating: number, image: string, stock?: number }} SavedItem */

export const SavedContext = createContext(null);
