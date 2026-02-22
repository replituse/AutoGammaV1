import { Layout } from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ServiceMaster, PPFMaster, AccessoryMaster, JobCard } from "@shared/schema";
import { api } from "@shared/routes";
import { useState, useEffect } from "react";
import { 
  ChevronLeft, 
  ChevronDown,
  ChevronRight,
  User, 
  Car, 
  Settings, 
  Shield, 
  Package, 
  FileText, 
  Trash2 
} from "lucide-react";

  const jobCardSchema = z.object({
    customerName: z.string().min(1, "Customer name is required"),
    phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
    emailAddress: z.string().optional().or(z.literal("")),
    referralSource: z.string().min(1, "Referral source is required"),
    referrerName: z.string().optional().or(z.literal("")),
    referrerPhone: z.string().optional().or(z.literal("")),
    make: z.string().min(1, "Vehicle make is required"),
    model: z.string().min(1, "Vehicle model is required"),
    year: z.string().min(1, "Vehicle year is required"),
    licensePlate: z.string().min(1, "License plate is required"),
    vehicleType: z.string().optional(),
    services: z.array(z.any()).default([]),
    ppfs: z.array(z.any()).default([]),
    accessories: z.array(z.any()).default([]),
    laborCharge: z.coerce.number().default(0),
    discount: z.coerce.number().default(0),
    gst: z.coerce.number().default(18),
    serviceNotes: z.string().optional().or(z.literal("")),
    status: z.string().optional(),
    date: z.string().optional(),
    estimatedCost: z.number().optional(),
    technician: z.string().optional(),
  });

  type JobCardFormValues = z.infer<typeof jobCardSchema>;

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function AddJobPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  const jobId = searchParams.get("id");
  const prefillPhone = searchParams.get("phone");

  const { data: jobCards = [], isFetched: isJobCardsFetched } = useQuery<JobCard[]>({
    queryKey: ["/api/job-cards"],
  });

  const [hasPrefilled, setHasPrefilled] = useState(false);

  const form = useForm<JobCardFormValues>({
    resolver: zodResolver(jobCardSchema),
    defaultValues: {
      customerName: "",
      phoneNumber: "",
      emailAddress: "",
      referralSource: "",
      referrerName: "",
      referrerPhone: "",
      make: "",
      model: "",
      year: "",
      licensePlate: "",
      vehicleType: "",
      services: [],
      ppfs: [],
      accessories: [],
      laborCharge: 0,
      discount: 0,
      gst: 18,
      serviceNotes: "",
    },
  });

  // Prefill customer information if phone is provided in URL
  useEffect(() => {
    if (prefillPhone && !jobId && isJobCardsFetched && !hasPrefilled) {
      const existingJob = jobCards.find(j => j.phoneNumber === prefillPhone);
      if (existingJob) {
        form.reset({
          customerName: existingJob.customerName,
          phoneNumber: existingJob.phoneNumber,
          emailAddress: existingJob.emailAddress || "",
          referralSource: existingJob.referralSource,
          referrerName: existingJob.referrerName || "",
          referrerPhone: existingJob.referrerPhone || "",
          make: "",
          model: "",
          year: "",
          licensePlate: "",
          vehicleType: "",
          services: [],
          ppfs: [],
          accessories: [],
          laborCharge: 0,
          discount: 0,
          gst: 18,
          serviceNotes: "",
        });
        setHasPrefilled(true);
      } else {
        // If no job card exists, we might want to still prefill the phone number
        form.setValue("phoneNumber", prefillPhone);
        setHasPrefilled(true);
      }
    }
  }, [prefillPhone, jobId, jobCards, isJobCardsFetched, hasPrefilled, form]);

  const { data: jobToEdit, isLoading: isLoadingJob, refetch: refetchJob } = useQuery<JobCard>({
    queryKey: ["/api/job-cards", jobId],
    queryFn: async () => {
      console.log("Fetching job for edit, jobId:", jobId);
      const res = await fetch(`/api/job-cards/${jobId}`);
      if (!res.ok) throw new Error("Failed to fetch job");
      const data = await res.json();
      console.log("Fetched job data:", data);
      return data;
    },
    enabled: !!jobId,
    staleTime: 0, 
    gcTime: 0,    
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Force refetch whenever jobId changes and also on component mount
  useEffect(() => {
    if (jobId) {
      console.log("Job ID effect triggered for", jobId, "- forcing refetch");
      refetchJob();
    }
  }, [jobId, refetchJob]);

  // Handle initial form reset and subsequent Job ID changes
  useEffect(() => {
    // If we have a jobId but the jobToEdit is either missing or belongs to a different ID, don't reset yet
    if (jobId && jobToEdit && String(jobToEdit.id) === String(jobId)) {
      console.log("Resetting form with matched jobToEdit data for jobId:", jobId);
      form.reset({
        customerName: jobToEdit.customerName || "",
        phoneNumber: jobToEdit.phoneNumber || "",
        emailAddress: jobToEdit.emailAddress || "",
        referralSource: jobToEdit.referralSource || "",
        referrerName: jobToEdit.referrerName || "",
        referrerPhone: jobToEdit.referrerPhone || "",
        make: jobToEdit.make || "",
        model: jobToEdit.model || "",
        year: jobToEdit.year || "",
        licensePlate: jobToEdit.licensePlate || "",
        vehicleType: jobToEdit.vehicleType || "",
        services: (jobToEdit.services || []).map(s => ({
          serviceId: (s as any).serviceId || (s as any).id,
          name: s.name,
          price: s.price,
          technician: s.technician
        })),
        ppfs: (jobToEdit.ppfs || []).reduce((acc: any[], p: any) => {
          const ppfId = String((p as any).ppfId || (p as any).id || (p as any)._id);
          const warranty = (p as any).warranty || p.name?.match(/\((.*)\)/)?.[1]?.split(" - ")?.[1] || "";
          
          console.log('Mapping PPF entry:', { ppfId, warranty, original: p });
          
          // Improved existing entry matching: explicitly handle cases where ppfId might be missing or different field names
          const existing = acc.find(item => {
            const itemPpfId = String(item.ppfId || item.id || item._id);
            return itemPpfId === ppfId && item.warranty === warranty;
          });
          
          if (existing) {
            // Group rolls for same PPF and Warranty
            existing.rollUsed = (existing.rollUsed || 0) + (p.rollUsed || 0);
            
            // Rebuild the name by aggregating quantities from the name strings
            // We need to parse all quantities from the incoming name too
            const rollMatches = (p.name || "").matchAll(/Quantity: (\d+(?:\.\d+)?)sqft \(from (.*?)\)/g);
            for (const match of rollMatches) {
              const qty = match[1];
              const rollName = match[2];
              
              const existingRollRegex = new RegExp(`Quantity: (\\d+(?:\\.\\d+)?)sqft \\(from ${rollName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`);
              const existingRollMatch = (existing.name || "").match(existingRollRegex);
              
              if (existingRollMatch) {
                const oldQty = parseFloat(existingRollMatch[1]);
                const newQty = oldQty + parseFloat(qty);
                existing.name = existing.name.replace(existingRollRegex, `Quantity: ${newQty}sqft (from ${rollName})`);
              } else {
                existing.name += ` , Quantity: ${qty}sqft (from ${rollName})`;
              }
            }
            
            // Update rollsUsed array
            const rollsToMerge = p.rollsUsed || (p.rollId ? [{
              rollId: p.rollId,
              rollName: p.rollName || "Unknown Roll",
              rollUsed: p.rollUsed
            }] : []);

            rollsToMerge.forEach((newRoll: any) => {
              existing.rollsUsed = existing.rollsUsed || [];
              const existingRollEntry = existing.rollsUsed.find((r: any) => r.rollId === newRoll.rollId);
              if (existingRollEntry) {
                existingRollEntry.rollUsed += newRoll.rollUsed;
              } else {
                existing.rollsUsed.push({
                  rollId: newRoll.rollId,
                  rollName: newRoll.rollName || "Unknown Roll",
                  rollUsed: newRoll.rollUsed
                });
              }
            });
          } else {
            acc.push({
              ppfId,
              name: p.name,
              price: p.price,
              technician: p.technician,
              rollUsed: p.rollUsed,
              rollsUsed: p.rollsUsed || (p.rollId ? [{
                rollId: p.rollId,
                rollName: p.rollName || "Unknown Roll",
                rollUsed: p.rollUsed
              }] : []),
              warranty
            });
          }
          return acc;
        }, []),
        accessories: (jobToEdit.accessories || []).map(a => ({
          accessoryId: (a as any).accessoryId || (a as any).id,
          name: a.name,
          price: a.price,
          quantity: a.quantity
        })),
        laborCharge: jobToEdit.laborCharge || 0,
        discount: jobToEdit.discount || 0,
        gst: jobToEdit.gst || 18,
        serviceNotes: jobToEdit.serviceNotes || "",
      });
    } else if (!jobId && !prefillPhone) {
      // Only clear form if there's no prefillPhone (prefillPhone is handled by its own useEffect)
      console.log("No jobId and no prefillPhone - Clearing form for new job card");
      form.reset({
        customerName: "",
        phoneNumber: "",
        emailAddress: "",
        referralSource: "",
        referrerName: "",
        referrerPhone: "",
        make: "",
        model: "",
        year: "",
        licensePlate: "",
        vehicleType: "",
        services: [],
        ppfs: [],
        accessories: [],
        laborCharge: 0,
        discount: 0,
        gst: 18,
        serviceNotes: "",
      });
    }
  }, [jobToEdit, jobId, prefillPhone, form.reset]);

  const { fields: serviceFields, append: appendService, remove: removeService } = useFieldArray({
    control: form.control,
    name: "services",
  });

  const { fields: ppfFields, append: appendPPF, remove: removePPF } = useFieldArray({
    control: form.control,
    name: "ppfs",
  });

  const { fields: accessoryFields, append: appendAccessory, remove: removeAccessory } = useFieldArray({
    control: form.control,
    name: "accessories",
  });

  // Masters Queries
  const { data: services = [] } = useQuery<ServiceMaster[]>({
    queryKey: [api.masters.services.list.path],
  });
  const { data: ppfMasters = [] } = useQuery<PPFMaster[]>({
    queryKey: [api.masters.ppf.list.path],
  });
  const { data: accessories = [] } = useQuery<AccessoryMaster[]>({
    queryKey: [api.masters.accessories.list.path],
  });
  const { data: technicians = [] } = useQuery<any[]>({
    queryKey: [api.technicians.list.path],
  });

  // Local selection states
  const [selectedService, setSelectedService] = useState("");
  const [selectedServiceVehicleType, setSelectedServiceVehicleType] = useState("");
  const [selectedTechnician, setSelectedTechnician] = useState("");
  const [selectedPPF, setSelectedPPF] = useState("");
  const currentPPF = ppfMasters.find(p => p.id === selectedPPF);
  const [selectedPPFRoll, setSelectedPPFRoll] = useState("");
  const [selectedPPFVehicleType, setSelectedPPFVehicleType] = useState("");
  const [selectedWarranty, setSelectedWarranty] = useState("");
  const [rollQty, setRollQty] = useState(0);
  const [selectedAccessoryCategory, setSelectedAccessoryCategory] = useState("");
  const [selectedAccessory, setSelectedAccessory] = useState("");
  const [accessoryQty, setAccessoryQty] = useState(1);
  const [showBusinessDialog, setShowBusinessDialog] = useState(false);
  const [servicesExpanded, setServicesExpanded] = useState(false);
  const [ppfExpanded, setPpfExpanded] = useState(false);
  const [accessoriesExpanded, setAccessoriesExpanded] = useState(false);
  const [laborBusiness, setLaborBusiness] = useState<string>("Auto Gamma");
  const [businessAssignments, setBusinessAssignments] = useState<Record<string, string>>({});
  const [pendingFormData, setPendingFormData] = useState<any>(null);
  const [markAsPaid, setMarkAsPaid] = useState(false);
  const [payments, setPayments] = useState<{ amount: number; method: string; date: string }[]>([
    { amount: 0, method: "Cash", date: new Date().toISOString().split("T")[0] }
  ]);

  const handleAddPayment = () => {
    setPayments([...payments, { amount: 0, method: "Cash", date: new Date().toISOString().split("T")[0] }]);
  };

  const handleRemovePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const handlePaymentChange = (index: number, field: string, value: any) => {
    const newPayments = [...payments];
    let finalValue = value;
    
    if (field === "amount") {
      // Remove any non-numeric characters except for the decimal point
      const sanitizedValue = String(value).replace(/[^0-9.]/g, "");
      finalValue = sanitizedValue === "" ? 0 : sanitizedValue;

      const subtotal = [...form.getValues("services"), ...form.getValues("ppfs"), ...form.getValues("accessories")].reduce((acc, curr) => acc + (curr.price || 0), 0) + Number(form.getValues("laborCharge") || 0);
      const afterDiscount = subtotal - Number(form.getValues("discount") || 0);
      const tax = afterDiscount * (Number(form.getValues("gst") || 18) / 100);
      const totalEstimatedCost = Math.round(afterDiscount + tax);
      
      const otherPaymentsTotal = payments.reduce((acc, p, i) => i === index ? acc : acc + Number(p.amount || 0), 0);
      const maxAllowed = totalEstimatedCost - otherPaymentsTotal;
      
      if (Number(finalValue) > maxAllowed) {
        finalValue = maxAllowed;
      }
    }
    
    newPayments[index] = { ...newPayments[index], [field]: finalValue };
    setPayments(newPayments);
  };

  const handleAddService = () => {
    const s = services.find(item => item.id === selectedService);
    const tech = technicians.find(t => t.id === selectedTechnician);
    const vehicleType = form.getValues("vehicleType");
    
    if (!vehicleType) {
      toast({
        title: "Vehicle Type Required",
        description: "Please select a Vehicle Type in the Vehicle Information section first.",
        variant: "destructive",
      });
      return;
    }

    const vehiclePricing = s?.pricingByVehicleType.find(p => p.vehicleType === vehicleType);
    
    if (s) {
      appendService({ 
        serviceId: s.id!, 
        id: s.id!,
        name: `${s.name} (${vehicleType})`,
        price: vehiclePricing?.price || 0,
        technician: tech?.name
      } as any);
      setSelectedService("");
      setSelectedTechnician("");
    }
  };

  const handleAddPPF = () => {
    const p = ppfMasters.find(item => item.id === selectedPPF);
    const roll = p?.rolls?.find((r: any) => r._id === selectedPPFRoll || r.id === selectedPPFRoll);
    const tech = technicians.find(t => t.id === selectedTechnician);
    const vehicleType = form.getValues("vehicleType");

    if (!vehicleType) {
      toast({
        title: "Vehicle Type Required",
        description: "Please select a Vehicle Type in the Vehicle Information section first.",
        variant: "destructive",
      });
      return;
    }

    // Check if roll has enough quantity using real-time stock
    if (roll && rollQty > realTimeStock) {
      toast({
        title: "Insufficient Stock",
        description: `Selected roll only has ${realTimeStock} sqft remaining (accounting for other items in this job).`,
        variant: "destructive",
      });
      return;
    }

    const vehiclePricing = p?.pricingByVehicleType.find(v => v.vehicleType === vehicleType);
    const option = vehiclePricing?.options.find(o => o.warrantyName === selectedWarranty);
    
    if (p && selectedWarranty) {
      console.log('=== Adding PPF Roll ===');
      console.log('Selected PPF:', p);
      console.log('Selected Warranty:', selectedWarranty);
      console.log('Selected Roll:', roll);
      console.log('Quantity Used:', rollQty);

      const currentPPFs = [...form.getValues("ppfs")];
      console.log('Current PPF List in form:', currentPPFs);

      // Updated matching logic to be more robust during edits
      const existingPPFIndex = currentPPFs.findIndex(
        (field: any) => {
          const fieldPpfId = String(field.ppfId || field.id || field._id);
          const match = fieldPpfId === String(p.id) && String(field.warranty) === String(selectedWarranty);
          console.log(`Checking match for field:`, {
            fieldPpfId,
            pId: p.id,
            fieldWarranty: field.warranty,
            selectedWarranty,
            isMatch: match
          });
          return match;
        }
      );

      console.log('Found existing match index:', existingPPFIndex);
      if (existingPPFIndex !== -1) {
        const existingField = currentPPFs[existingPPFIndex];
        
        const newRollUsed = (existingField.rollUsed || 0) + (rollQty || 0);
        
        const rollsUsed = existingField.rollsUsed || [];
        const existingRollIndex = rollsUsed.findIndex((r: any) => r.rollId === selectedPPFRoll);
        
        if (existingRollIndex !== -1) {
          rollsUsed[existingRollIndex].rollUsed += (rollQty || 0);
        } else {
          rollsUsed.push({
            rollId: selectedPPFRoll,
            rollName: roll?.name || "Unknown Roll",
            rollUsed: rollQty || 0
          });
        }

        let updatedName = `${p.name} (${vehicleType} - ${selectedWarranty})`;
        const newRollDesc = `Quantity: ${rollQty}sqft (from ${roll?.name || 'Unknown Roll'})`;
        
        // Robust multi-line name parsing and rebuilding
        if (existingField.name.includes("Quantity:")) {
          const rollRegex = new RegExp(`Quantity: (\\d+(?:\\.\\d+)?)sqft \\(from ${roll?.name?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') || 'Unknown Roll'}\\)`);
          const nameLines = existingField.name.split('\n');
          const header = nameLines[0];
          let quantitiesPart = nameLines.slice(1).join('\n');
          
          if (quantitiesPart.match(rollRegex)) {
            const rollMatch = quantitiesPart.match(rollRegex);
            const oldQty = parseFloat(rollMatch![1]);
            const newQtyForThisRoll = oldQty + (rollQty || 0);
            quantitiesPart = quantitiesPart.replace(rollRegex, `Quantity: ${newQtyForThisRoll}sqft (from ${roll?.name || 'Unknown Roll'})`);
            updatedName = `${header}\n${quantitiesPart}`;
          } else {
            updatedName = `${header}\n${quantitiesPart} , ${newRollDesc}`;
          }
        } else {
          updatedName = `${updatedName}\n${newRollDesc}`;
        }

        currentPPFs[existingPPFIndex] = {
          ...existingField,
          rollUsed: newRollUsed > 0 ? newRollUsed : undefined,
          rollsUsed: rollsUsed,
          name: updatedName,
          warranty: selectedWarranty,
          technician: tech?.name || existingField.technician,
          price: option?.price || 0,
        };
        form.setValue("ppfs", currentPPFs);
      } else {
        appendPPF({ 
          ppfId: p.id!, 
          name: `${p.name} (${vehicleType} - ${selectedWarranty})\nQuantity: ${rollQty}sqft (from ${roll?.name || 'Unknown Roll'})`,
          rollId: selectedPPFRoll,
          rollName: roll?.name || "Unknown Roll",
          rollUsed: rollQty > 0 ? rollQty : undefined,
          rollsUsed: [{
            rollId: selectedPPFRoll,
            rollName: roll?.name || "Unknown Roll",
            rollUsed: rollQty || 0
          }],
          price: option?.price || 0,
          technician: tech?.name,
          warranty: selectedWarranty
        } as any);
      }
      setSelectedPPF("");
      setSelectedPPFRoll("");
      setSelectedWarranty("");
      setRollQty(0);
      setSelectedTechnician("");
    }
  };

  const handleAddAccessory = () => {
    const a = accessories.find(item => item.id === selectedAccessory);
    if (a) {
      if (accessoryQty > a.quantity) {
        toast({
          title: "Insufficient Stock",
          description: `Only ${a.quantity} units available in stock.`,
          variant: "destructive",
        });
        return;
      }
      appendAccessory({ 
        accessoryId: a.id!, 
        name: a.name, 
        price: a.price,
        quantity: accessoryQty 
      } as any);
      setSelectedAccessory("");
      setAccessoryQty(1);
    }
  };

  const createJobMutation = useMutation({
    mutationFn: async (payload: any) => {
      console.log("Mutation starting - Payload:", payload);
      const method = jobId ? "PATCH" : "POST";
      const url = jobId ? `/api/job-cards/${jobId}` : "/api/job-cards";
      const res = await apiRequest(method, url, payload);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-cards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/job-cards", jobId] });
      queryClient.invalidateQueries({ queryKey: [api.masters.accessories.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: jobId ? "Job Card Updated" : "Job Card Created",
        description: `Successfully ${jobId ? "updated" : "created"} the job card.`,
      });
      setLocation("/job-cards");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const onSubmit = async (data: JobCardFormValues) => {
    try {
      console.log("Form submitted with data:", data);
      
      const subtotal = [...data.services, ...data.ppfs, ...data.accessories].reduce((acc, curr) => acc + (curr.price * (curr.quantity || 1)), 0) + Number(data.laborCharge || 0);
      const afterDiscount = subtotal - Number(data.discount || 0);
      const tax = afterDiscount * (Number(data.gst || 18) / 100);
      const totalEstimatedCost = Math.round(afterDiscount + tax);
      
      const payload = {
        ...data,
        estimatedCost: totalEstimatedCost,
        status: jobToEdit?.status || "Pending",
        accessories: data.accessories.map(a => ({
          ...a,
          quantity: Number(a.quantity || 1),
          accessoryId: a.accessoryId || a.id
        }))
      };

      if (!showBusinessDialog) {
        setPendingFormData(payload);
        const assignments: Record<string, string> = {};
        data.services.forEach((_, i) => assignments[`service-${i}`] = "Auto Gamma");
        data.ppfs.forEach((_, i) => assignments[`ppf-${i}`] = "Auto Gamma");
        data.accessories.forEach((_, i) => assignments[`accessory-${i}`] = "Auto Gamma");
        setBusinessAssignments(assignments);
        setShowBusinessDialog(true);
      } else {
        await createJobMutation.mutateAsync(payload);
      }
    } catch (error) {
      console.error("Error in onSubmit:", error);
      toast({
        title: "Submission Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCompleteWithBusiness = () => {
    if (!pendingFormData) return;

    const formattedData = {
      ...pendingFormData,
      services: (pendingFormData.services || []).map((s: any, i: number) => ({ 
        ...s, 
        price: Number(s.price),
        business: businessAssignments[`service-${i}`] || "Auto Gamma"
      })),
      ppfs: (pendingFormData.ppfs || []).map((p: any, i: number) => ({ 
        ...p, 
        price: Number(p.price),
        business: businessAssignments[`ppf-${i}`] || "Auto Gamma"
      })),
      accessories: (pendingFormData.accessories || []).map((a: any, i: number) => ({ 
        ...a, 
        price: Number(a.price),
        business: businessAssignments[`accessory-${i}`] || "Auto Gamma"
      })),
      isPaid: markAsPaid,
      payments: markAsPaid ? payments.map((p: any) => ({ ...p, amount: Number(p.amount) })) : [],
      laborCharge: Number(pendingFormData.laborCharge),
      laborBusiness: laborBusiness,
      discount: Number(pendingFormData.discount),
      gst: Number(pendingFormData.gst),
    };
    createJobMutation.mutate(formattedData);
    setShowBusinessDialog(false);
  };

  const realTimeStock = (() => {
    if (!selectedPPF || !selectedPPFRoll) return 0;
    const p = ppfMasters.find(item => item.id === selectedPPF);
    const roll = p?.rolls?.find((r: any) => (r._id?.toString() === selectedPPFRoll) || (r.id?.toString() === selectedPPFRoll));
    if (!roll) return 0;
    
    const usedInCurrentJob = (form.watch("ppfs") || []).reduce((acc: number, field: any) => {
      if (field.rollId === selectedPPFRoll) {
        return acc + (Number(field.rollUsed) || 0);
      }
      return acc;
    }, 0);
    
    return (Number(roll.stock) || 0) - usedInCurrentJob;
  })();
  const { data: vehicleTypes = [] } = useQuery<any[]>({
    queryKey: [api.masters.vehicleTypes.list.path],
  });
  const { data: accessoryCategories = [] } = useQuery<any[]>({
    queryKey: [api.masters.accessories.categories.list.path],
  });

  return (
    <Layout>
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        <div className="flex items-start gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setLocation("/job-cards")}
            className="mt-1"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{jobId ? "Edit Job Card" : "Create New Job Card"}</h1>
            <p className="text-sm text-muted-foreground">
              {jobId ? `Updating details for job card ${jobToEdit?.jobNo || ""}` : "Fill in the details below to create a new service job card"}
            </p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Customer Information Section */}
            <Card className="border-slate-200">
              <CardHeader className="border-b bg-slate-50/50 py-4 px-6">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-red-600" />
                  <CardTitle className="text-lg font-bold">Customer Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-slate-700">Customer Name *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="John Doe" 
                            {...field} 
                            className={`h-11 ${form.formState.errors.customerName ? "border-red-500 ring-1 ring-red-500 bg-red-50" : ""}`} 
                          />
                        </FormControl>
                        {form.formState.errors.customerName && (
                          <p className="text-xs font-bold text-red-600 mt-1">
                            {form.formState.errors.customerName.message}
                          </p>
                        )}
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-slate-700">Phone Number *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="+1 555-0123" 
                            {...field} 
                            className={`h-11 ${form.formState.errors.phoneNumber ? "border-red-500 ring-1 ring-red-500 bg-red-50" : ""}`} 
                          />
                        </FormControl>
                        {form.formState.errors.phoneNumber && (
                          <p className="text-xs font-bold text-red-600 mt-1">
                            {form.formState.errors.phoneNumber.message}
                          </p>
                        )}
                      </FormItem>
                    )}
                  />
                </div>
                  <FormField
                    control={form.control}
                    name="emailAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-slate-700">Email Address</FormLabel>
                        <FormControl>
                          <Input placeholder="john@example.com" {...field} className="h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="referralSource"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-slate-700">How did you hear about us? *</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger className={`h-11 ${form.formState.errors.referralSource ? "border-red-500 ring-1 ring-red-500 bg-red-50" : ""}`}>
                              <SelectValue placeholder="Select referral source" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Google Search">Google Search</SelectItem>
                            <SelectItem value="Social Media">Social Media</SelectItem>
                            <SelectItem value="Friend/Family">Friend/Family</SelectItem>
                            <SelectItem value="Advertisement">Advertisement</SelectItem>
                            <SelectItem value="Walk-in">Walk-in</SelectItem>
                          </SelectContent>
                        </Select>
                        {form.formState.errors.referralSource && (
                          <p className="text-xs font-bold text-red-600 mt-1">
                            {form.formState.errors.referralSource.message}
                          </p>
                        )}
                      </FormItem>
                    )}
                  />
                    {form.watch("referralSource") === "Friend/Family" && (
                      <div className="contents">
                        <FormField
                          control={form.control}
                          name="referrerName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-semibold text-slate-700">Referrer's Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter name of the person who referred" {...field} className="h-11" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="referrerPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-semibold text-slate-700">Referrer's Phone Number</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="10-digit mobile number" 
                                  {...field} 
                                  className="h-11" 
                                  maxLength={10}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, "");
                                    field.onChange(value);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>
              </CardContent>
            </Card>

            {/* Vehicle Information Section */}
            <Card className="border-slate-200">
              <CardHeader className="border-b bg-slate-50/50 py-4 px-6">
                <div className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-red-600" />
                  <CardTitle className="text-lg font-bold">Vehicle Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                  <FormField
                    control={form.control}
                    name="make"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-slate-700">Make *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g. Toyota" 
                            {...field} 
                            className={`h-11 ${form.formState.errors.make ? "border-red-500 ring-1 ring-red-500 bg-red-50" : ""}`} 
                          />
                        </FormControl>
                        {form.formState.errors.make && (
                          <p className="text-xs font-bold text-red-600 mt-1">
                            {form.formState.errors.make.message}
                          </p>
                        )}
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-slate-700">Model *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g. Camry" 
                            {...field} 
                            className={`h-11 ${form.formState.errors.model ? "border-red-500 ring-1 ring-red-500 bg-red-50" : ""}`} 
                          />
                        </FormControl>
                        {form.formState.errors.model && (
                          <p className="text-xs font-bold text-red-600 mt-1">
                            {form.formState.errors.model.message}
                          </p>
                        )}
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-slate-700">Year *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="2024" 
                            {...field}
                            inputMode="numeric"
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '');
                              field.onChange(value);
                            }}
                            className={`h-11 ${form.formState.errors.year ? "border-red-500 ring-1 ring-red-500 bg-red-50" : ""}`} 
                          />
                        </FormControl>
                        {form.formState.errors.year && (
                          <p className="text-xs font-bold text-red-600 mt-1">
                            {form.formState.errors.year.message}
                          </p>
                        )}
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="licensePlate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-slate-700">License Plate *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="ABC-1234" 
                            {...field} 
                            className={`h-11 ${form.formState.errors.licensePlate ? "border-red-500 ring-1 ring-red-500 bg-red-50" : ""}`} 
                          />
                        </FormControl>
                        {form.formState.errors.licensePlate && (
                          <p className="text-xs font-bold text-red-600 mt-1">
                            {form.formState.errors.licensePlate.message}
                          </p>
                        )}
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="vehicleType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-slate-700">Vehicle Type *</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value || ""}
                        >
                          <FormControl>
                            <SelectTrigger className={`h-11 ${form.formState.errors.vehicleType ? "border-red-500 ring-1 ring-red-500 bg-red-50" : ""}`}>
                              <SelectValue placeholder="Select vehicle type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {vehicleTypes.map((type: any) => (
                              <SelectItem key={type.id} value={type.name}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {form.formState.errors.vehicleType && (
                          <p className="text-xs font-bold text-red-600 mt-1">
                            {form.formState.errors.vehicleType.message}
                          </p>
                        )}
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Service Section */}
            <Card className="border-slate-200">
              <CardHeader 
                className="border-b bg-slate-50/50 py-4 px-6 cursor-pointer hover:bg-slate-100/50 transition-colors"
                onClick={() => setServicesExpanded(!servicesExpanded)}
                data-testid="section-services-header"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-red-600" />
                    <CardTitle className="text-lg font-bold">Services</CardTitle>
                    {serviceFields.length > 0 && (
                      <span className="text-sm text-muted-foreground">({serviceFields.length} added)</span>
                    )}
                  </div>
                  {servicesExpanded ? (
                    <ChevronDown className="h-5 w-5 text-slate-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-slate-500" />
                  )}
                </div>
              </CardHeader>
              {servicesExpanded && (
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-5 space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Service</label>
                    <Select value={selectedService} onValueChange={setSelectedService}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select Service" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map(s => (
                          <SelectItem key={s.id} value={s.id!}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Technician (Optional)</label>
                    <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select Tech" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {technicians.filter(t => t.status === "active").map(t => (
                          <SelectItem key={t.id} value={t.id!}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Button type="button" onClick={handleAddService} className="w-full h-11 bg-red-100 text-red-600 hover:bg-red-200 border-none font-semibold">
                      Add Service
                    </Button>
                  </div>
                </div>
                {serviceFields.length > 0 && (
                  <div className="border rounded-md overflow-hidden">
                    <div className="bg-slate-50 p-3 text-xs font-bold uppercase text-slate-500 border-b">Selected Services</div>
                    <div className="divide-y">
                      {serviceFields.map((field, index) => (
                        <div key={field.id} className="flex items-center justify-between p-3">
                          <span className="text-sm font-medium">{(field as any).name}</span>
                          <Button variant="ghost" size="icon" type="button" onClick={() => removeService(index)} className="h-8 w-8 text-slate-400 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
              )}
            </Card>

            {/* PPF Section */}
            <Card className="border-slate-200">
              <CardHeader 
                className="border-b bg-slate-50/50 py-4 px-6 cursor-pointer hover:bg-slate-100/50 transition-colors"
                onClick={() => setPpfExpanded(!ppfExpanded)}
                data-testid="section-ppf-header"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-red-600" />
                    <CardTitle className="text-lg font-bold">PPF (Paint Protection Film)</CardTitle>
                    {ppfFields.length > 0 && (
                      <span className="text-sm text-muted-foreground">({ppfFields.length} added)</span>
                    )}
                  </div>
                  {ppfExpanded ? (
                    <ChevronDown className="h-5 w-5 text-slate-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-slate-500" />
                  )}
                </div>
              </CardHeader>
              {ppfExpanded && (
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">PPF</label>
                    <Select value={selectedPPF} onValueChange={setSelectedPPF}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select PPF" />
                      </SelectTrigger>
                      <SelectContent>
                        {ppfMasters.map(p => (
                          <SelectItem key={p.id} value={p.id!}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Warranty</label>
                    <Select value={selectedWarranty} onValueChange={setSelectedWarranty} disabled={!selectedPPF || !form.watch("vehicleType")}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select Warranty" />
                      </SelectTrigger>
                      <SelectContent>
                        {currentPPF?.pricingByVehicleType
                          ?.find(v => v.vehicleType === form.watch("vehicleType"))
                          ?.options.map(o => (
                            <SelectItem key={o.warrantyName} value={o.warrantyName}>{o.warrantyName}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Select Roll</label>
                    <Select value={selectedPPFRoll} onValueChange={setSelectedPPFRoll} disabled={!selectedPPF}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select Roll" />
                      </SelectTrigger>
                      <SelectContent>
                        {currentPPF?.rolls?.map((roll: any) => (
                          <SelectItem key={roll._id || roll.id} value={(roll._id || roll.id)!}>
                            {roll.name} ({(() => {
                              const used = form.watch("ppfs")
                                .filter((p: any) => p.ppfId === selectedPPF) // Filter by PPF first
                                .reduce((sum: number, p: any) => {
                                  // Extract roll quantity from description for this specific roll
                                  const rollNameEscaped = roll.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                  const regex = new RegExp(`Quantity: (\\d+(?:\\.\\d+)?)sqft \\(from ${rollNameEscaped}\\)`);
                                  const match = p.name.match(regex);
                                  return sum + (match ? parseFloat(match[1]) : 0);
                                }, 0);
                              return (roll.stock || 0) - used;
                            })()} sqft)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Sqft Used</label>
                    <Input 
                      type="text" 
                      inputMode="decimal"
                      value={rollQty || ""} 
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, '');
                        setRollQty(parseFloat(value) || 0);
                      }}
                      placeholder="0"
                      className="h-11"
                      disabled={!selectedPPF}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Button type="button" onClick={handleAddPPF} className="w-full h-11 bg-red-100 text-red-600 hover:bg-red-200 border-none font-semibold">
                      Add PPF
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Available Stock (sqft)</label>
                    <div className="h-11 flex items-center px-3 border rounded-md bg-slate-50 font-medium text-slate-700">
                      {selectedPPF ? (() => {
                        const totalStock = currentPPF?.rolls?.reduce((acc: number, r: any) => acc + (r.stock || 0), 0) || 0;
                        const usedInCurrentJob = ppfFields.reduce((acc, field: any) => {
                          const isSamePPF = field.ppfId === selectedPPF;
                          if (!isSamePPF) return acc;
                          
                          // Sum all quantities from the description
                          const matches = field.name.match(/Quantity: (\d+(?:\.\d+)?)sqft/g);
                          if (matches) {
                            return acc + matches.reduce((sum: number, m: string) => {
                              const q = m.match(/Quantity: (\d+(?:\.\d+)?)sqft/);
                              return sum + (q ? parseFloat(q[1]) : 0);
                            }, 0);
                          }
                          return acc + (field.rollUsed || 0);
                        }, 0);
                        return `${totalStock - usedInCurrentJob} sqft`;
                      })() : "Select PPF"}
                    </div>
                  </div>
                </div>
                {ppfFields.length > 0 && (
                  <div className="border rounded-md overflow-hidden">
                    <div className="bg-slate-50 p-3 text-xs font-bold uppercase text-slate-500 border-b">Selected PPF</div>
                      {ppfFields.map((field, index) => (
                        <div key={field.id} className="flex items-center justify-between p-3">
                          <div className="flex flex-col">
                            {field.name.split('\n').map((line: string, i: number) => (
                              <span key={i} className={i === 0 ? "text-sm font-medium" : "text-xs text-slate-500"}>
                                {line}
                              </span>
                            ))}
                          </div>
                          <Button variant="ghost" size="icon" type="button" onClick={() => removePPF(index)} className="h-8 w-8 text-slate-400 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
              )}
            </Card>

            {/* Accessories Section */}
            <Card className="border-slate-200">
              <CardHeader 
                className="border-b bg-slate-50/50 py-4 px-6 cursor-pointer hover:bg-slate-100/50 transition-colors"
                onClick={() => setAccessoriesExpanded(!accessoriesExpanded)}
                data-testid="section-accessories-header"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-red-600" />
                    <CardTitle className="text-lg font-bold">Accessories</CardTitle>
                    {accessoryFields.length > 0 && (
                      <span className="text-sm text-muted-foreground">({accessoryFields.length} added)</span>
                    )}
                  </div>
                  {accessoriesExpanded ? (
                    <ChevronDown className="h-5 w-5 text-slate-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-slate-500" />
                  )}
                </div>
              </CardHeader>
              {accessoriesExpanded && (
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Accessory Category</label>
                    <Select value={selectedAccessoryCategory} onValueChange={setSelectedAccessoryCategory}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Accessory Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from(new Set(accessories.map(a => a.category))).map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Accessory Name</label>
                    <Select value={selectedAccessory} onValueChange={setSelectedAccessory} disabled={!selectedAccessoryCategory}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Accessory Name" />
                      </SelectTrigger>
                      <SelectContent>
                        {accessories.filter(a => a.category === selectedAccessoryCategory).map(a => (
                          <SelectItem key={a.id} value={a.id!}>{a.name} (Stock: {a.quantity})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Quantity</label>
                    <Input 
                      type="number" 
                      min="1" 
                      value={accessoryQty} 
                      onChange={(e) => setAccessoryQty(parseInt(e.target.value) || 1)}
                      className="h-11"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Button type="button" onClick={handleAddAccessory} className="w-full h-11 bg-red-100 text-red-600 hover:bg-red-200 border-none font-semibold">
                      Add Accessory
                    </Button>
                  </div>
                </div>
            {accessoryFields.length > 0 && (
              <div className="border rounded-md overflow-hidden">
                <div className="bg-slate-50 p-3 text-xs font-bold uppercase text-slate-500 border-b">Selected Accessories</div>
                <div className="divide-y">
                  {accessoryFields.map((field, index) => (
                    <div key={field.id} className="flex items-center justify-between p-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{(field as any).name}</span>
                        <span className="text-xs text-muted-foreground">Quantity: {(field as any).quantity || 1}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" type="button" onClick={() => removeAccessory(index)} className="h-8 w-8 text-slate-400 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
              </CardContent>
              )}
            </Card>

            {/* Charges and Notes Section */}
            <Card className="border-slate-200">
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="laborCharge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-slate-700">Labor Charge (₹)</FormLabel>
                        <FormControl>
                          <Input 
                            type="text" 
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={field.value === 0 ? "" : field.value} 
                            onChange={e => {
                              const val = e.target.value.replace(/\D/g, "");
                              field.onChange(val === "" ? 0 : parseInt(val));
                            }} 
                            placeholder="0"
                            className="h-11 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="discount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-slate-700">Discount (₹)</FormLabel>
                        <FormControl>
                          <Input 
                            type="text" 
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={field.value === 0 ? "" : field.value} 
                            onChange={e => {
                              const val = e.target.value.replace(/\D/g, "");
                              field.onChange(val === "" ? 0 : parseInt(val));
                            }} 
                            placeholder="0"
                            className="h-11 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gst"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-slate-700">GST (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="text" 
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={field.value === 0 ? "" : field.value} 
                            onChange={e => {
                              const val = e.target.value.replace(/\D/g, "");
                              field.onChange(val === "" ? 0 : parseInt(val));
                            }} 
                            placeholder="0"
                            className="h-11 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="serviceNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-slate-700">Service Notes</FormLabel>
                      <FormControl>
                        <Input placeholder="Additional notes for the invoice..." {...field} className="h-11" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Pricing Table */}
                <div className="mt-8 border-t pt-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800">
                    <FileText className="h-5 w-5 text-red-600" />
                    Estimated Pricing
                  </h3>
                  <div className="bg-slate-50 rounded-lg border overflow-hidden">
                    <div className="p-4 space-y-3">
                      {[...form.watch("services"), ...form.watch("ppfs"), ...form.watch("accessories")].map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <span className="text-slate-600">{item.name} {item.quantity ? `(x${item.quantity})` : ""}</span>
                          <span className="font-semibold">₹{(item.price || 0).toLocaleString()}</span>
                        </div>
                      ))}
                      {form.watch("laborCharge") > 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-600">Labor Charge</span>
                          <span className="font-semibold">₹{form.watch("laborCharge").toLocaleString()}</span>
                        </div>
                      )}
                      
                      <div className="border-t pt-2 mt-2 space-y-2">
                        <div className="flex justify-between items-center text-sm font-medium">
                          <span className="text-slate-500">Subtotal</span>
                          <span>₹{(
                            [...form.watch("services"), ...form.watch("ppfs"), ...form.watch("accessories")].reduce((acc, curr) => acc + (curr.price || 0), 0) + 
                            Number(form.watch("laborCharge") || 0)
                          ).toLocaleString()}</span>
                        </div>
                        
                        {form.watch("discount") > 0 && (
                          <div className="flex justify-between items-center text-sm font-medium text-green-600">
                            <span>Discount</span>
                            <span>-₹{form.watch("discount").toLocaleString()}</span>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center text-sm font-medium text-slate-500">
                          <span>GST ({form.watch("gst")}%)</span>
                          <span>₹{Math.round(
                            ([...form.watch("services"), ...form.watch("ppfs"), ...form.watch("accessories")].reduce((acc, curr) => acc + (curr.price || 0), 0) + 
                            Number(form.watch("laborCharge") || 0) - 
                            Number(form.watch("discount") || 0)) * 
                            (form.watch("gst") / 100)
                          ).toLocaleString()}</span>
                        </div>
                        
                        <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                          <span className="text-base font-bold text-slate-900">Total Estimated Cost</span>
                          <span className="text-xl font-black text-red-600">
                            ₹{Math.round(
                              ([...form.watch("services"), ...form.watch("ppfs"), ...form.watch("accessories")].reduce((acc, curr) => acc + (curr.price || 0), 0) + 
                              Number(form.watch("laborCharge") || 0) - 
                              Number(form.watch("discount") || 0)) * 
                              (1 + form.watch("gst") / 100)
                            ).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => setLocation("/job-cards")} className="h-12 px-8">
                Cancel
              </Button>
              <Button 
                type="button"
                className="h-12 px-8 bg-red-600 hover:bg-red-700 font-bold" 
                disabled={createJobMutation.isPending}
                onClick={async () => {
                  console.log("Update button clicked manually");
                  const data = form.getValues();
                  await onSubmit(data);
                }}
              >
                {createJobMutation.isPending ? "Saving..." : (jobId ? "Update Job Card" : "Create Job Card")}
              </Button>
            </div>
          </form>
        </Form>

        <Dialog open={showBusinessDialog} onOpenChange={setShowBusinessDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Complete Service - Assign Business</DialogTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Select which business each service item belongs to. Separate invoices will be generated for each business.
              </p>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {pendingFormData?.services.map((item: any, i: number) => (
                <div key={`service-${i}`} className="flex items-center justify-between p-4 border rounded-lg bg-slate-50/50">
                  <div>
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    <p className="text-sm text-slate-500">₹{item.price}</p>
                  </div>
                  <div className="w-48">
                    <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Assign To</p>
                    <Select 
                      value={businessAssignments[`service-${i}`]} 
                      onValueChange={(val: any) => setBusinessAssignments(prev => ({ ...prev, [`service-${i}`]: val }))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Auto Gamma">Auto Gamma</SelectItem>
                        <SelectItem value="AGNX">AGNX</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}

              {pendingFormData?.ppfs.map((item: any, i: number) => (
                <div key={`ppf-${i}`} className="flex items-center justify-between p-4 border rounded-lg bg-slate-50/50">
                  <div>
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    <p className="text-sm text-slate-500">₹{item.price}</p>
                  </div>
                  <div className="w-48">
                    <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Assign To</p>
                    <Select 
                      value={businessAssignments[`ppf-${i}`]} 
                      onValueChange={(val: any) => setBusinessAssignments(prev => ({ ...prev, [`ppf-${i}`]: val }))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Auto Gamma">Auto Gamma</SelectItem>
                        <SelectItem value="AGNX">AGNX</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}

              {pendingFormData?.accessories.map((item: any, i: number) => (
                <div key={`accessory-${i}`} className="flex items-center justify-between p-4 border rounded-lg bg-slate-50/50">
                  <div>
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    <p className="text-sm text-slate-500">₹{item.price}</p>
                  </div>
                  <div className="w-48">
                    <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Assign To</p>
                    <Select 
                      value={businessAssignments[`accessory-${i}`]} 
                      onValueChange={(val: any) => setBusinessAssignments(prev => ({ ...prev, [`accessory-${i}`]: val }))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Auto Gamma">Auto Gamma</SelectItem>
                        <SelectItem value="AGNX">AGNX</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}

              {pendingFormData && pendingFormData.laborCharge > 0 && (
                <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50/50">
                  <div>
                    <p className="font-semibold text-slate-900">Labor Charge</p>
                    <p className="text-sm text-slate-500">₹{pendingFormData.laborCharge}</p>
                  </div>
                  <div className="w-48">
                    <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Assign To</p>
                    <Select 
                      value={laborBusiness} 
                      onValueChange={(val: any) => setLaborBusiness(val)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Auto Gamma">Auto Gamma</SelectItem>
                        <SelectItem value="AGNX">AGNX</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-bold">Mark as Paid</label>
                    <p className="text-xs text-muted-foreground">Has the customer already paid for this service?</p>
                  </div>
                  <div className="flex items-center h-9">
                    <input 
                      type="checkbox" 
                      checked={markAsPaid} 
                      onChange={(e) => setMarkAsPaid(e.target.checked)}
                      className="h-5 w-5 rounded border-gray-300 text-red-600 focus:ring-red-600"
                    />
                  </div>
                </div>

            {markAsPaid && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between bg-red-50 p-3 rounded-lg border border-red-100">
                  <div className="flex items-center gap-2 text-red-700">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm font-bold uppercase tracking-wider">Total Invoice Amount:</span>
                    <span className="text-lg font-black tracking-tight">₹{Math.round(
                      ([...form.watch("services"), ...form.watch("ppfs"), ...form.watch("accessories")].reduce((acc, curr) => acc + (curr.price || 0), 0) + 
                      Number(form.watch("laborCharge") || 0) - 
                      Number(form.watch("discount") || 0)) * 
                      (1 + form.watch("gst") / 100)
                    ).toLocaleString()}</span>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block leading-none mb-1">Total Paid</span>
                      <span className="text-sm font-bold text-slate-700">₹{payments.reduce((acc, p) => acc + Number(p.amount || 0), 0).toLocaleString()}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block leading-none mb-1">Remaining</span>
                      <span className={`text-sm font-bold ${
                        Math.round(
                          ([...form.watch("services"), ...form.watch("ppfs"), ...form.watch("accessories")].reduce((acc, curr) => acc + (curr.price || 0), 0) + 
                          Number(form.watch("laborCharge") || 0) - 
                          Number(form.watch("discount") || 0)) * 
                          (1 + form.watch("gst") / 100)
                        ) - payments.reduce((acc, p) => acc + Number(p.amount || 0), 0) > 0 ? "text-red-600" : "text-green-600"
                      }`}>₹{Math.max(0, Math.round(
                        ([...form.watch("services"), ...form.watch("ppfs"), ...form.watch("accessories")].reduce((acc, curr) => acc + (curr.price || 0), 0) + 
                        Number(form.watch("laborCharge") || 0) - 
                        Number(form.watch("discount") || 0)) * 
                        (1 + form.watch("gst") / 100)
                      ) - payments.reduce((acc, p) => acc + Number(p.amount || 0), 0)).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900">Payment Details</h4>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAddPayment}
                    className="h-8"
                  >
                    Add Payment Method
                  </Button>
                </div>
                    
                    {payments.map((payment, index) => (
                      <div key={index} className="flex flex-row items-end gap-3 bg-slate-50 p-3 rounded-md relative group">
                        <div className="flex-1 min-w-[140px]">
                          <label className="text-[10px] font-bold text-slate-400 mb-1 block uppercase tracking-wider">Method</label>
                          <Select 
                            value={payment.method} 
                            onValueChange={(val) => handlePaymentChange(index, "method", val)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Cash">Cash</SelectItem>
                              <SelectItem value="UPI / GPay">UPI / GPay</SelectItem>
                              <SelectItem value="Card">Card</SelectItem>
                              <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1 min-w-[140px]">
                          <label className="text-[10px] font-bold text-slate-400 mb-1 block uppercase tracking-wider">Date</label>
                          <Input
                            type="date"
                            value={payment.date}
                            onChange={(e) => handlePaymentChange(index, "date", e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="flex-1 min-w-[120px]">
                          <label className="text-[10px] font-bold text-slate-400 mb-1 block uppercase tracking-wider">Amount</label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={payment.amount === 0 ? "" : payment.amount}
                            onChange={(e) => handlePaymentChange(index, "amount", e.target.value)}
                            placeholder="0"
                            className="h-9 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                        <div className="flex-none">
                          {payments.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemovePayment(index)}
                              className="h-9 w-9 text-slate-300 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowBusinessDialog(false)}>Cancel</Button>
              <Button 
                className="bg-red-600 hover:bg-red-700 text-white" 
                onClick={handleCompleteWithBusiness}
                disabled={createJobMutation.isPending}
              >
                {createJobMutation.isPending ? "Generating..." : "Complete & Generate Invoice"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
