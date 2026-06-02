import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProfileForm } from "./ProfileForm";
import { getProfile } from "@/actions/profile.actions";
import { Package, User, MapPin, Phone, Globe, FileText, Mail } from "lucide-react";
import Link from "next/link";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const profile = await getProfile();

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Could not load profile. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600 text-sm mt-1">
          Manage your personal information and contact details
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile info card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
            {profile.image ? (
              <img
                src={profile.image}
                alt={profile.name ?? "Profile"}
                className="h-20 w-20 rounded-full object-cover mx-auto"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-brand-light flex items-center justify-center mx-auto">
                <User className="h-8 w-8 text-brand" />
              </div>
            )}
            <h2 className="mt-4 text-lg font-semibold text-gray-900">
              {profile.name ?? "Unnamed"}
            </h2>
            <p className="text-sm text-gray-500">{profile.email}</p>

            <hr className="my-6" />

            <nav className="space-y-1 text-left">
              <Link
                href="/profile"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-brand bg-brand-light rounded-lg"
              >
                <User className="h-4 w-4" />
                Profile
              </Link>
              <Link
                href="/orders"
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Package className="h-4 w-4" />
                Orders
              </Link>
            </nav>
          </div>
        </div>

        {/* Profile form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <ProfileForm profile={profile} />
          </div>

          {/* Read-only details card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Account Details
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Email</p>
                  <p className="text-sm text-gray-500">{profile.email}</p>
                </div>
              </div>
              {profile.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Phone</p>
                    <p className="text-sm text-gray-500">{profile.phone}</p>
                  </div>
                </div>
              )}
              {profile.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Location</p>
                    <p className="text-sm text-gray-500">{profile.location}</p>
                  </div>
                </div>
              )}
              {profile.socialLinks && (
                <div className="flex items-start gap-3">
                  <Globe className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Social Media Links
                    </p>
                    <p className="text-sm text-gray-500 whitespace-pre-line">
                      {profile.socialLinks}
                    </p>
                  </div>
                </div>
              )}
              {profile.additionalNotes && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Additional Notes
                    </p>
                    <p className="text-sm text-gray-500 whitespace-pre-line">
                      {profile.additionalNotes}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Member Since</p>
                  <p className="text-sm text-gray-500">
                    {new Date(profile.createdAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
