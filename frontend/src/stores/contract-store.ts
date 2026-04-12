/**
 * Zustand store for contract state management.
 */

import { create } from "zustand";
import type { Contract, Clause, ContractAnalysisSummary } from "@/types";

interface ContractState {
  contracts: Contract[];
  currentContract: Contract | null;
  clauses: Clause[];
  analysisSummary: ContractAnalysisSummary | null;
  isLoading: boolean;
  setContracts: (contracts: Contract[]) => void;
  setCurrentContract: (contract: Contract | null) => void;
  setClauses: (clauses: Clause[]) => void;
  setAnalysisSummary: (summary: ContractAnalysisSummary | null) => void;
  setLoading: (loading: boolean) => void;
  updateContractStatus: (id: string, status: Contract["status"]) => void;
}

export const useContractStore = create<ContractState>((set) => ({
  contracts: [],
  currentContract: null,
  clauses: [],
  analysisSummary: null,
  isLoading: false,

  setContracts: (contracts) => set({ contracts }),
  setCurrentContract: (contract) => set({ currentContract: contract }),
  setClauses: (clauses) => set({ clauses }),
  setAnalysisSummary: (summary) => set({ analysisSummary: summary }),
  setLoading: (loading) => set({ isLoading: loading }),

  updateContractStatus: (id, status) =>
    set((state) => ({
      contracts: state.contracts.map((c) =>
        c.id === id ? { ...c, status } : c
      ),
      currentContract:
        state.currentContract?.id === id
          ? { ...state.currentContract, status }
          : state.currentContract,
    })),
}));
