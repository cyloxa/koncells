"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  User,
  Phone,
  MapPin,
  Globe,
  FileText,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import { updateProfile } from "@/actions/profile.actions";

interface ProfileData {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  location: string | null;
  socialLinks: string | null;
  additionalNotes: string | null;
  image: string | null;
  createdAt: Date;
}

export function ProfileForm({ profile }: { profile: ProfileData }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    const result = await updateProfile({
      name: formData.get("name") as string,
      phone: (formData.get("phone") as string) || null,
      location: (formData.get("location") as string) || null,
      socialLinks: (formData.get("socialLinks") as string) || null,
      additionalNotes: (formData.get("additionalNotes") as string) || null,
    });

    if (!result.success) {
      setError(result.error);
      toast.error(result.error);
      setIsLoading(false);
      return;
    }

    toast.success("Profile updated successfully!");
    router.refresh();
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Edit Profile
      </h3>

      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-lg">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Customer Name <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={profile.name ?? ""}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="phone"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Phone
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={profile.phone ?? ""}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
            placeholder="+1 (555) 123-4567"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="location"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Location
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            id="location"
            name="location"
            type="text"
            defaultValue={profile.location ?? ""}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
            placeholder="City, Country"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="socialLinks"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Social Media Links
        </label>
        <div className="relative">
          <Globe className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Textarea
            id="socialLinks"
            name="socialLinks"
            className="pl-10"
            defaultValue={profile.socialLinks ?? ""}
            placeholder="Instagram: @yourhandle&#10;Facebook: yourname&#10;WhatsApp: +123456789"
            rows={3}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="additionalNotes"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Additional Notes
        </label>
        <div className="relative">
          <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Textarea
            id="additionalNotes"
            name="additionalNotes"
            className="pl-10"
            defaultValue={profile.additionalNotes ?? ""}
            placeholder="Any additional information you'd like to share..."
            rows={3}
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          "Saving..."
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Save Changes
          </>
        )}
      </Button>
    </form>
  );
}
