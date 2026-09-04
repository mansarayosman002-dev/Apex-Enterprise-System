import React from 'react';
import { PayrollRecord } from '../../types/index.ts';
import { Printer, Download, X, Building2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { ApexLogo } from '../common/ApexLogo.tsx';

interface PayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: PayrollRecord | null;
  currency?: string;
  companyName?: string;
}

export const PayslipModal: React.FC<PayslipModalProps> = ({
  isOpen,
  onClose,
  record,
  currency = 'NLe ',
  companyName = 'Apex Enterprise Solutions',
}) => {
  if (!isOpen || !record) return null;

  const handlePrint = () => {
    window.print();
  };

  const basic = parseFloat(record.basicSalary.toString() || '0');
  const overtime = parseFloat(record.overtimeAmount.toString() || '0');
  const allowances = parseFloat(record.allowances.toString() || '0');
  const deductions = parseFloat(record.deductions.toString() || '0');
  const gross = parseFloat(record.grossSalary.toString() || '0');
  const net = parseFloat(record.netSalary.toString() || '0');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
        {/* Header Controls */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-6 py-3.5 print:hidden">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Official Salary Payslip Statement
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-indigo-700 transition"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Payslip Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-white dark:bg-slate-900 print:bg-white text-slate-900 dark:text-white print:text-slate-900" id="printable-payslip">
          {/* Corporate Letterhead */}
          <div className="flex items-start justify-between border-b-2 border-slate-800 dark:border-slate-700 pb-5">
            <div>
              <ApexLogo size="md" showSubtitle={false} />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 print:text-slate-700 mt-2">Apex Enterprise Solutions (SL) Ltd.</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 print:text-slate-500">15 Siaka Stevens Street, Freetown, Sierra Leone</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Enterprise HRMS & Digital Payroll Division</p>
            </div>
            <div className="text-right">
              <div className="inline-block rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1 text-xs font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wide">
                Payslip: {record.payrollPeriod}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Generated: {new Date().toLocaleDateString()}</p>
              <span className={`inline-flex items-center space-x-1 text-[11px] font-semibold mt-1 ${
                record.status === 'Paid' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
              }`}>
                <CheckCircle2 className="h-3 w-3" />
                <span>Status: {record.status}</span>
              </span>
            </div>
          </div>

          {/* Employee & Period Details */}
          <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 print:bg-slate-50 p-4 border border-slate-200 dark:border-slate-700 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Employee Name:</span>
              <p className="font-semibold text-slate-900 dark:text-white print:text-slate-900 text-sm mt-0.5">{record.employeeName}</p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Employee Code:</span>
              <p className="font-semibold text-slate-900 dark:text-white print:text-slate-900 text-sm mt-0.5">{record.employeeCode}</p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Department:</span>
              <p className="font-medium text-slate-800 dark:text-slate-200 print:text-slate-800 mt-0.5">{record.departmentName}</p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Position / Designation:</span>
              <p className="font-medium text-slate-800 dark:text-slate-200 print:text-slate-800 mt-0.5">{record.position}</p>
            </div>
          </div>

          {/* Earnings & Deductions Breakdown Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Earnings Column */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 border-b border-slate-200 dark:border-slate-700 font-semibold text-xs text-slate-700 dark:text-slate-200">
                Earnings / Allowances
              </div>
              <div className="p-4 space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Basic Monthly Salary</span>
                  <span className="font-medium text-slate-900 dark:text-white">{currency}{basic.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Attendance Overtime Pay</span>
                  <span className="font-medium text-slate-900 dark:text-white">+{currency}{overtime.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Special / Travel Allowances</span>
                  <span className="font-medium text-slate-900 dark:text-white">+{currency}{allowances.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between font-semibold text-slate-900 dark:text-white">
                  <span>Gross Earnings</span>
                  <span className="text-indigo-600 dark:text-indigo-400">{currency}{gross.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Deductions Column */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 border-b border-slate-200 dark:border-slate-700 font-semibold text-xs text-slate-700 dark:text-slate-200">
                Deductions & Adjustments
              </div>
              <div className="p-4 space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Standard Statutory / Policy Deductions</span>
                  <span className="font-medium text-rose-600 dark:text-rose-400">-{currency}{deductions.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400 dark:text-slate-500">
                  <span>Tax & Pension</span>
                  <span className="italic">Exempt / Not configured</span>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 pt-6 flex justify-between font-semibold text-slate-900 dark:text-white">
                  <span>Total Deductions</span>
                  <span className="text-rose-600 dark:text-rose-400">-{currency}{deductions.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Salary Highlight Box */}
          <div className="rounded-xl bg-slate-900 text-white p-5 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-400">Net Take-Home Salary</span>
              <p className="text-xs text-slate-400 mt-0.5">Calculated: Basic + Overtime + Allowances - Deductions</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-emerald-400">
                {currency}{net.toFixed(2)}
              </div>
              <span className="text-[10px] text-slate-400">Disbursed via Direct Bank Deposit</span>
            </div>
          </div>

          {/* Security stamp & signature */}
          <div className="flex items-end justify-between pt-6 border-t border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <span>Computer Generated Document. Verified by Digital Payroll Ledger.</span>
            </div>
            <div className="text-center w-40">
              <div className="border-b border-slate-400 dark:border-slate-600 pb-6 mb-1 text-slate-300 dark:text-slate-400 font-serif italic">
                Authorized Officer
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Payroll Officer Signature</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
