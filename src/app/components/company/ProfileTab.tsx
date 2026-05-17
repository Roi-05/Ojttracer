import { useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { CheckCircle, Edit } from "lucide-react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Country, State, City } from "country-state-city";
import { toast } from "sonner";
import * as api from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";

interface ProfileTabProps {
  companyInfo: any;
}

export function ProfileTab({ companyInfo }: ProfileTabProps) {
  const { refreshProfile } = useAuth();
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    companyName: companyInfo.name,
    industry: companyInfo.industry,
    phone: companyInfo.phone,
    hrContact: companyInfo.hrContact,
    hrEmail: companyInfo.hrEmail,
    description: companyInfo.description,
    country: "PH",
    state: "",
    city: "",
    street: companyInfo.address,
  });

  const countries = Country.getAllCountries();
  const states = profileForm.country ? State.getStatesOfCountry(profileForm.country) : [];
  const cities = profileForm.state ? City.getCitiesOfState(profileForm.country, profileForm.state) : [];

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const countryObj = Country.getCountryByCode(profileForm.country);
      const stateObj = State.getStateByCodeAndCountry(profileForm.state, profileForm.country);
      const cityObj = City.getCitiesOfState(profileForm.country, profileForm.state).find(c => c.name === profileForm.city);

      const parts = [profileForm.street];
      if (cityObj) parts.push(cityObj.name);
      if (stateObj) parts.push(stateObj.name);
      if (countryObj) parts.push(countryObj.name);

      const fullAddress = parts.filter(Boolean).join(", ");

      await api.updateProfile({
        companyName: profileForm.companyName,
        industry: profileForm.industry,
        phone: profileForm.phone,
        hrContact: profileForm.hrContact,
        hrEmail: profileForm.hrEmail,
        description: profileForm.description,
        companyAddress: fullAddress,
      });
      await refreshProfile();
      toast.success("Profile updated successfully!");
    } catch (e: any) {
      toast.error(`Failed to update profile: ${e.message}`);
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Company Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your company information and HTE accreditation</p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 text-white gap-2"
          onClick={handleSaveProfile}
          disabled={isSavingProfile}
        >
          <Edit className="h-4 w-4" /> {isSavingProfile ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="border-0 shadow-sm text-center">
          <CardContent className="p-6">
            <div className="h-20 w-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl font-bold text-green-600">
                {profileForm.companyName.charAt(0) || "C"}
              </span>
            </div>
            <h3 className="font-bold text-lg">{profileForm.companyName}</h3>
            <p className="text-muted-foreground text-sm">{profileForm.industry}</p>
            <div className="mt-3 flex flex-col gap-2">
              <span className="inline-flex items-center justify-center gap-1.5 text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full mx-auto">
                <CheckCircle className="h-3 w-3" /> MOA {companyInfo.moaStatus === 'active' ? 'Active' : 'Pending'}
              </span>
              <p className="text-xs text-muted-foreground">Accredited until: {companyInfo.accreditedUntil || "—"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardContent className="p-6">
            <h3 className="font-semibold text-sm mb-4">Company Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs text-muted-foreground">Company Name</Label><Input value={profileForm.companyName} onChange={e => setProfileForm(p => ({ ...p, companyName: e.target.value }))} className="mt-1" /></div>
              <div><Label className="text-xs text-muted-foreground">Industry</Label><Input value={profileForm.industry} onChange={e => setProfileForm(p => ({ ...p, industry: e.target.value }))} className="mt-1" /></div>
              <div><Label className="text-xs text-muted-foreground">Supervisor</Label><Input value={profileForm.hrContact} onChange={e => setProfileForm(p => ({ ...p, hrContact: e.target.value }))} className="mt-1" /></div>
              <div><Label className="text-xs text-muted-foreground">Supervisor Email</Label><Input value={profileForm.hrEmail} onChange={e => setProfileForm(p => ({ ...p, hrEmail: e.target.value }))} className="mt-1" /></div>
              <div><Label className="text-xs text-muted-foreground">Phone</Label><Input value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} className="mt-1" /></div>
              <div>
                <Label className="text-xs text-muted-foreground">MOA Status</Label>
                <div className="mt-1 flex items-center gap-2 h-10 px-3 bg-muted/30 rounded-lg">
                  {companyInfo.moaStatus === 'active' ? (
                    <><CheckCircle className="h-4 w-4 text-green-600" /><span className="text-sm text-green-700 font-medium">Active</span></>
                  ) : (
                    <><span className="text-sm text-orange-700 font-medium">Pending Verification</span></>
                  )}
                </div>
              </div>

              <div className="col-span-2 mt-2">
                <h4 className="text-sm font-medium mb-3 border-b pb-2">Address Details</h4>
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Country</Label>
                    <select
                      value={profileForm.country}
                      onChange={e => setProfileForm(p => ({ ...p, country: e.target.value, state: "", city: "" }))}
                      className="w-full mt-1 border border-border rounded-lg p-2 text-sm bg-card"
                    >
                      <option value="">Select Country</option>
                      {countries.map(c => <option key={c.isoCode} value={c.isoCode}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Region / State</Label>
                    <select
                      value={profileForm.state}
                      onChange={e => setProfileForm(p => ({ ...p, state: e.target.value, city: "" }))}
                      className="w-full mt-1 border border-border rounded-lg p-2 text-sm bg-card"
                      disabled={!profileForm.country}
                    >
                      <option value="">Select Region</option>
                      {states.map(s => <option key={s.isoCode} value={s.isoCode}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">City / Municipality</Label>
                    <select
                      value={profileForm.city}
                      onChange={e => setProfileForm(p => ({ ...p, city: e.target.value }))}
                      className="w-full mt-1 border border-border rounded-lg p-2 text-sm bg-card"
                      disabled={!profileForm.state}
                    >
                      <option value="">Select City</option>
                      {cities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Street / Building / Barangay</Label>
                  <Input
                    value={profileForm.street}
                    onChange={e => setProfileForm(p => ({ ...p, street: e.target.value }))}
                    className="mt-1"
                    placeholder="e.g. 123 Main St, Brgy. San Jose"
                  />
                </div>
              </div>

              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Company Description</Label>
                <textarea rows={3} value={profileForm.description} onChange={e => setProfileForm(p => ({ ...p, description: e.target.value }))} className="w-full mt-1 border border-border rounded-lg p-2 text-sm bg-card resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
