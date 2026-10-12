import { Link } from "react-router";
import { Button } from "../components/ui/button";
import { GraduationCap, ArrowRight, Clock, FileText, ShieldCheck, MapPin, Building2 } from "lucide-react";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-between">
      {/* Navigation Bar */}
      <nav className="bg-card/80 backdrop-blur-md sticky top-0 z-50 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-primary rounded-lg p-2">
                <GraduationCap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground tracking-tight">
                PSU-Link
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login">
                <Button variant="outline" size="sm" className="border-border text-foreground hover:bg-muted">
                  Sign In
                </Button>
              </Link>
              <Link to="/login">
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3.5 py-1.5 rounded-full text-xs font-semibold">
              Pampanga State University – Porac Campus
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-foreground tracking-tight leading-tight">
              OJT Monitoring & Documentation Portal
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              A centralized platform for BSIT students, partner companies, and coordinators to manage daily time records, accomplishments, and internship documentation.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link to="/login">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto font-medium">
                  Access Portal
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 bg-muted/40 border-y border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Key Features
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                Everything required for managing and completing the OJT program.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Feature 1 */}
              <div className="bg-card rounded-xl p-6 border border-border space-y-3">
                <div className="bg-primary/10 w-10 h-10 rounded-lg flex items-center justify-center text-primary">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-foreground text-base">Attendance & DTR</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Log time-in and time-out with device verification and selfie photo verification.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-card rounded-xl p-6 border border-border space-y-3">
                <div className="bg-primary/10 w-10 h-10 rounded-lg flex items-center justify-center text-primary">
                  <MapPin className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-foreground text-base">Live Map Tracker</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Supervisors can monitor clocked-in interns in real time with interactive location maps.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-card rounded-xl p-6 border border-border space-y-3">
                <div className="bg-primary/10 w-10 h-10 rounded-lg flex items-center justify-center text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-foreground text-base">Journal Export</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Record daily accomplishment logs and generate official university-formatted PDF journals.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="bg-card rounded-xl p-6 border border-border space-y-3">
                <div className="bg-primary/10 w-10 h-10 rounded-lg flex items-center justify-center text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-foreground text-base">Document & MOA</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Submit required student documents and track company accreditation and MOA status.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">
            PSU-Link · Pampanga State University (Porac Campus)
          </p>
          <p>&copy; {new Date().getFullYear()} OJT Management System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
