'use client';

import { api } from "@/lib/api";
import type { UserResponse } from "@/types/User";
import { ApiException } from "@/utils/exceptions/ApiException";
import { useEffect, useState } from "react";

export function UserTable() {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadUsers() {
      try {
        const response = await api.users.getAll();
        if (isActive) {
          setUsers(response.data);
        }
      } catch (err) {
        if (isActive) {
          setError(
            err instanceof ApiException ? err.message : "Failed to load users"
          );
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadUsers();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <section className="min-w-0 flex-1 rounded-2xl border border-gray-700 bg-gray-800/40 p-6 sm:p-8">
      <h1 className="mb-6 text-3xl font-bold text-white">Users</h1>
      {error && (
        <p role="alert" className="mb-4 text-sm text-red-400">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status" className="text-gray-400">
          Loading users...
        </p>
      ) : error ? null : users.length === 0 ? (
        <p className="text-gray-400">No users found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-gray-300">
            <thead>
              <tr className="border-b border-gray-700 text-xs uppercase tracking-wide text-gray-400">
                <th scope="col" className="px-4 py-3">Name</th>
                <th scope="col" className="px-4 py-3">Email</th>
                <th scope="col" className="px-4 py-3">Role</th>
                <th scope="col" className="px-4 py-3">Verification</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.email} className="border-b border-gray-700/70">
                  <td className="px-4 py-3 font-medium text-white">{user.name}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">{user.role}</td>
                  <td className="px-4 py-3">
                    {user.is_verified ? "Verified" : "Not verified"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default UserTable;
