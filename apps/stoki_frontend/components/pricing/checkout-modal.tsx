// "use client";

// import { useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
// import { motion, AnimatePresence } from "framer-motion";
// import {
//   ShieldCheck,
//   CheckCircle2,
//   Lock,
//   ArrowRight,
//   Zap,
//   Sparkles,
//   X,
//   Loader2,
//   AlertCircle,
//   Building2,
//   Mail,
//   User,
// } from "lucide-react";
// import { cn } from "@/lib/utils";
// import { loadRazorpayScript, RazorpayOptions } from "@/lib/razorpay";
// import { API_ENDPOINTS } from "@/lib/api";
// import { CouponBar, CouponData } from "./coupon-bar";

// export interface PlanItem {
//   id: string; // e.g. "STARTER_30D", "PRO_30D", "ANNUAL"
//   name: string;
//   badge?: string;
//   basePrice: number;
//   periodText: string;
//   description: string;
//   features: string[];
// }

// interface CheckoutModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   selectedPlan: PlanItem;
// }

// export function CheckoutModal({ isOpen, onClose, selectedPlan }: CheckoutModalProps) {
//   const router = useRouter();

//   // User prefill state
//   const [userName, setUserName] = useState("Divansh Singh");
//   const [userEmail, setUserEmail] = useState("founder@redbull.com");
//   const [companyName, setCompanyName] = useState("Red Bull India");
//   const [authToken, setAuthToken] = useState<string | null>(null);

//   // Checkout calculation state
//   const [appliedCoupon, setAppliedCoupon] = useState<CouponData | null>(null);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [checkoutStep, setCheckoutStep] = useState<"checkout" | "verifying" | "success">("checkout");
//   const [errorMessage, setErrorMessage] = useState<string | null>(null);

//   useEffect(() => {
//     // Reset coupon when plan changes or modal opens
//     setAppliedCoupon(null);
//     setErrorMessage(null);
//     setCheckoutStep("checkout");

//     if (typeof window !== "undefined") {
//       const storedToken = localStorage.getItem("stoki_auth_token");
//       if (storedToken) setAuthToken(storedToken);
//       const storedEmail = localStorage.getItem("stoki_user_email");
//       if (storedEmail) setUserEmail(storedEmail);
//     }
//   }, [isOpen, selectedPlan.id]);

//   if (!isOpen) return null;

//   const basePrice = selectedPlan.basePrice;
//   const discountAmount = appliedCoupon ? appliedCoupon.discount_amount : 0;
//   const finalAmount = appliedCoupon ? appliedCoupon.final_amount : basePrice;

//   // Handle Razorpay Checkout Flow
//   const handleActivatePass = async () => {
//     setIsProcessing(true);
//     setErrorMessage(null);

//     try {
//       // 1. Ensure Razorpay script is loaded
//       const scriptReady = await loadRazorpayScript();
//       if (!scriptReady) {
//         throw new Error("Unable to connect to Razorpay secure checkout. Please check your internet connection.");
//       }

//       // Ensure mock/local auth token exists for API Gateway
//       let token = authToken;
//       if (!token) {
//         // Automatically request temporary tenant session if not logged in
//         try {
//           const authRes = await fetch(API_ENDPOINTS.register, {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({
//               email: userEmail || `guest_${Date.now()}@stoki.app`,
//               password: "SecurePass2026!",
//               company_name: companyName || "Stoki FMCG Brand",
//               full_name: userName || "Brand Founder",
//             }),
//           });
//           const authData = await authRes.json();
//           if (authData.access_token) {
//             token = authData.access_token;
//             setAuthToken(token);
//             if (token && typeof window !== "undefined") {
//               localStorage.setItem("stoki_auth_token", token);
//             }
//           }
//         } catch {
//           // If register fails because email exists, try login or proceed with optional header
//         }
//       }

//       const headers: Record<string, string> = {
//         "Content-Type": "application/json",
//       };
//       if (token) {
//         headers["Authorization"] = `Bearer ${token}`;
//       }

//       // 2. Call payments/create-order
//       const orderRes = await fetch(API_ENDPOINTS.createOrder, {
//         method: "POST",
//         headers,
//         body: JSON.stringify({
//           plan_id: selectedPlan.id,
//           coupon_code: appliedCoupon ? appliedCoupon.code : null,
//         }),
//       });

//       const orderData = await orderRes.json();
//       if (!orderRes.ok || !orderData.order_id) {
//         throw new Error(orderData.detail || "Failed to initialize payment gateway order.");
//       }

//       // 3. Configure Razorpay Standard Modal options (Option B Flow)
//       const options: RazorpayOptions = {
//         key: orderData.key_id,
//         amount: orderData.amount, // in paise
//         currency: orderData.currency || "INR",
//         name: "Stoki Intelligence",
//         description: `${selectedPlan.name} · 30-Day Intelligence Pass`,
//         order_id: orderData.order_id,
//         theme: {
//           color: "#10B981", // Stoki Emerald Accent
//         },
//         prefill: {
//           name: userName,
//           email: userEmail,
//         },
//         notes: {
//           plan_id: selectedPlan.id,
//           coupon_used: appliedCoupon?.code || "",
//         },
//         handler: async (response) => {
//           // Verification step
//           setCheckoutStep("verifying");
//           try {
//             const verifyRes = await fetch(API_ENDPOINTS.verifyPayment, {
//               method: "POST",
//               headers,
//               body: JSON.stringify({
//                 razorpay_order_id: response.razorpay_order_id,
//                 razorpay_payment_id: response.razorpay_payment_id,
//                 razorpay_signature: response.razorpay_signature,
//               }),
//             });

//             const verifyData = await verifyRes.json();
//             if (!verifyRes.ok || !verifyData.success) {
//               throw new Error(verifyData.detail || "Payment verification failed.");
//             }

//             setCheckoutStep("success");
//             setTimeout(() => {
//               onClose();
//               router.push("/dashboard?payment=success");
//             }, 1800);
//           } catch (verifyErr: any) {
//             setErrorMessage(verifyErr.message || "Payment verification failed.");
//             setCheckoutStep("checkout");
//           }
//         },
//         modal: {
//           ondismiss: () => {
//             setIsProcessing(false);
//           },
//         },
//       };

//       if (!window.Razorpay) {
//         throw new Error("Razorpay modal SDK failed to initialize.");
//       }

//       const rzp = new window.Razorpay(options);
//       rzp.open();
//       setIsProcessing(false);
//     } catch (err: any) {
//       setErrorMessage(err.message || "Something went wrong initiating checkout.");
//       setIsProcessing(false);
//     }
//   };

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
//       {/* Backdrop */}
//       <motion.div
//         initial={{ opacity: 0 }}
//         animate={{ opacity: 1 }}
//         exit={{ opacity: 0 }}
//         onClick={onClose}
//         className="fixed inset-0 bg-black/70 backdrop-blur-md"
//       />

//       {/* Modal Dialog Card */}
//       <motion.div
//         initial={{ opacity: 0, scale: 0.95, y: 12 }}
//         animate={{ opacity: 1, scale: 1, y: 0 }}
//         exit={{ opacity: 0, scale: 0.95, y: 12 }}
//         transition={{ type: "spring", duration: 0.35, bounce: 0.05 }}
//         className={cn(
//           "relative w-full max-w-lg rounded-2xl z-10 overflow-hidden shadow-2xl",
//           "bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800",
//           "text-zinc-900 dark:text-zinc-100"
//         )}
//       >
//         {/* Subtle Emerald Top Glow */}
//         <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

//         {/* Modal Header */}
//         <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-zinc-800/80">
//           <div className="flex items-center gap-3">
//             <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
//               <Zap className="w-4 h-4 fill-emerald-500/20" />
//             </div>
//             <div>
//               <h3 className="font-extrabold text-base tracking-tight">Checkout Summary</h3>
//               <p className="text-xs text-zinc-500 dark:text-zinc-400">
//                 Razorpay Standard 256-Bit SSL Checkout
//               </p>
//             </div>
//           </div>
//           <button
//             onClick={onClose}
//             aria-label="Close"
//             className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
//           >
//             <X className="w-4 h-4" />
//           </button>
//         </div>

//         {/* Modal Content */}
//         <div className="p-6 space-y-5">
//           {checkoutStep === "verifying" ? (
//             <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
//               <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
//               <div>
//                 <h4 className="font-bold text-base">Verifying Cryptographic Signature...</h4>
//                 <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mt-1">
//                   Validating Razorpay HMAC SHA256 checksum and provisioning dark-store telemetry quota.
//                 </p>
//               </div>
//             </div>
//           ) : checkoutStep === "success" ? (
//             <div className="py-10 flex flex-col items-center justify-center text-center space-y-3">
//               <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center border border-emerald-500/40">
//                 <CheckCircle2 className="w-8 h-8" />
//               </div>
//               <h4 className="font-bold text-lg text-zinc-900 dark:text-white">Subscription Active!</h4>
//               <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs">
//                 Your 30-Day Intelligence Pass is now live. Redirecting to your telemetry dashboard...
//               </p>
//             </div>
//           ) : (
//             <>
//               {/* Selected Plan Capsule */}
//               <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950/70 border border-slate-200 dark:border-zinc-800/90 flex items-center justify-between">
//                 <div>
//                   <div className="flex items-center gap-2">
//                     <span className="font-bold text-sm text-zinc-900 dark:text-zinc-50">
//                       {selectedPlan.name}
//                     </span>
//                     {selectedPlan.badge && (
//                       <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold uppercase">
//                         {selectedPlan.badge}
//                       </span>
//                     )}
//                   </div>
//                   <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
//                     {selectedPlan.description}
//                   </p>
//                 </div>
//                 <div className="text-right">
//                   <div className="font-mono text-base font-extrabold text-zinc-900 dark:text-zinc-50">
//                     ₹{basePrice.toLocaleString("en-IN")}
//                   </div>
//                   <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
//                     {selectedPlan.periodText}
//                   </span>
//                 </div>
//               </div>

//               {/* Prefill User Details */}
//               <div className="space-y-2">
//                 <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
//                   Billing Contact
//                 </span>
//                 <div className="grid grid-cols-2 gap-2 text-xs">
//                   <div className="relative flex items-center">
//                     <User className="absolute left-3 w-3.5 h-3.5 text-zinc-400" />
//                     <input
//                       type="text"
//                       value={userName}
//                       onChange={(e) => setUserName(e.target.value)}
//                       placeholder="Your Name"
//                       className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
//                     />
//                   </div>
//                   <div className="relative flex items-center">
//                     <Mail className="absolute left-3 w-3.5 h-3.5 text-zinc-400" />
//                     <input
//                       type="email"
//                       value={userEmail}
//                       onChange={(e) => setUserEmail(e.target.value)}
//                       placeholder="Work Email"
//                       className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
//                     />
//                   </div>
//                 </div>
//               </div>

//               {/* Price Breakdown */}
//               <div className="py-2.5 px-3.5 rounded-xl bg-slate-50/70 dark:bg-zinc-950/40 border border-slate-200/80 dark:border-zinc-800/60 space-y-2 text-xs">
//                 <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
//                   <span>Base Pass Price</span>
//                   <span className="font-mono">₹{basePrice.toLocaleString("en-IN")}</span>
//                 </div>

//                 {appliedCoupon && (
//                   <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
//                     <span className="flex items-center gap-1">
//                       <Sparkles className="w-3 h-3" />
//                       Promo Discount ({appliedCoupon.code})
//                     </span>
//                     <span className="font-mono">-₹{discountAmount.toLocaleString("en-IN")}</span>
//                   </div>
//                 )}

//                 <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-baseline font-bold text-sm text-zinc-900 dark:text-zinc-50">
//                   <span>Total Amount Due</span>
//                   <div className="text-right">
//                     <span className="font-mono text-lg text-emerald-600 dark:text-emerald-400">
//                       ₹{finalAmount.toLocaleString("en-IN")}
//                     </span>
//                     <span className="text-[10px] text-zinc-400 font-normal block">
//                       Incl. all taxes & dark store gateway fees
//                     </span>
//                   </div>
//                 </div>
//               </div>

//               {/* In-App Coupon Engine Bar */}
//               <CouponBar
//                 planId={selectedPlan.id}
//                 appliedCoupon={appliedCoupon}
//                 onApplySuccess={(data) => setAppliedCoupon(data)}
//                 onRemove={() => setAppliedCoupon(null)}
//                 authToken={authToken}
//               />

//               {/* Error Alert */}
//               {errorMessage && (
//                 <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
//                   <AlertCircle className="w-4 h-4 shrink-0" />
//                   <span>{errorMessage}</span>
//                 </div>
//               )}

//               {/* Action Buttons */}
//               <div className="pt-2 space-y-2">
//                 <button
//                   type="button"
//                   onClick={handleActivatePass}
//                   disabled={isProcessing}
//                   className={cn(
//                     "w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-lg",
//                     "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/20",
//                     "disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99]"
//                   )}
//                 >
//                   {isProcessing ? (
//                     <>
//                       <Loader2 className="w-4 h-4 animate-spin" />
//                       <span>Initiating Razorpay Modal...</span>
//                     </>
//                   ) : (
//                     <>
//                       <span>Activate Pass · ₹{finalAmount.toLocaleString("en-IN")}</span>
//                       <ArrowRight className="w-4 h-4" />
//                     </>
//                   )}
//                 </button>

//                 <div className="flex items-center justify-center gap-4 text-[11px] text-zinc-500 dark:text-zinc-400 pt-1">
//                   <span className="flex items-center gap-1">
//                     <Lock className="w-3 h-3 text-emerald-500" />
//                     256-Bit SSL Encrypted
//                   </span>
//                   <span>•</span>
//                   <span>Instant Dark Store Sync</span>
//                   <span>•</span>
//                   <span>GST Invoices Provided</span>
//                 </div>
//               </div>
//             </>
//           )}
//         </div>
//       </motion.div>
//     </div>
//   );
