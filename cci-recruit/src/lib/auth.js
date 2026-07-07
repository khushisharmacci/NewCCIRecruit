import { supabase } from "./supabase";

console.log("LOGIN CLICKED");
console.log("EMAIL", email);

const { data, error } =
  await supabase.auth.signInWithPassword({
    email,
    password,
  });

console.log("LOGIN DATA", data);
console.log("LOGIN ERROR", error);

console.log("EMAIL", email);
console.log("PASSWORD", password);

const { data, error } =
  await supabase.auth.signInWithPassword({
    email,
    password,
  });

console.log("LOGIN DATA", data);
console.log("LOGIN ERROR", error);

export const signOut = async () => {
  return await supabase.auth.signOut();
};

export const getCurrentUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
};