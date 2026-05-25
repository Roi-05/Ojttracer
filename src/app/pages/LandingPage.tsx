import { Link } from "react-router";
import { Button } from "../components/ui/button";
import { GraduationCap, Building2, Users, TrendingUp, Moon, Sun, ArrowRight, CheckCircle, FileText, LineChart, Clock, BarChart, FolderOpen, MapPin } from "lucide-react";
import { useState } from "react";

export function LandingPage() {
  return (
    <div>
      <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <nav className="bg-card/80 backdrop-blur-md sticky top-0 z-50 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="bg-primary rounded-lg p-2">
                <GraduationCap className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">
                PSU-Link
              </span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#home" className="text-foreground/70 hover:text-primary transition-colors font-medium">
                Home
              </a>
              <a href="#features" className="text-foreground/70 hover:text-primary transition-colors font-medium">
                Features
              </a>
              <a href="#about" className="text-foreground/70 hover:text-primary transition-colors font-medium">
                About
              </a>
              <Link to="/login">
                <Button variant="outline" className="border-border text-foreground hover:bg-muted">
                  Login
                </Button>
              </Link>
              <Link to="/login">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 relative">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
                <CheckCircle className="h-4 w-4" />
                Trusted by Pampanga State University, Porac Campus
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
                The Official{" "}
                <span className="text-primary relative">
                  OJT Monitoring and Documentation Portal
                  <svg className="absolute -bottom-2 left-0 w-full" height="8" viewBox="0 0 200 8" fill="none">
                    <path d="M1 5C50 2 100 2 199 5" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                </span>
                {" "}of Pampanga State University - Porac Campus
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Streamlining internship tracking, automated journal generation, and institutional compliance for BSIT students.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/login">
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto group">
                    Access Student Portal
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="border-border text-foreground hover:bg-muted w-full sm:w-auto">
                    Register External Deployment
                  </Button>
                </Link>
              </div>
              <div className="flex items-center gap-8 pt-4">
                <div>
                  <div className="text-3xl font-bold text-foreground">856</div>
                  <div className="text-sm text-muted-foreground">Deployed Students</div>
                </div>
                <div className="h-12 w-px bg-border"></div>
                <div>
                  <div className="text-3xl font-bold text-foreground">89</div>
                  <div className="text-sm text-muted-foreground">Partner Organizations</div>
                </div>
                <div className="h-12 w-px bg-border"></div>
                <div>
                  <div className="text-3xl font-bold text-foreground">100%</div>
                  <div className="text-sm text-muted-foreground">Compliance Rate</div>
                </div>
              </div>
            </div>
            <div className="hidden md:block relative">
              <div className="relative">
                <div className="absolute -top-4 -right-4 w-72 h-72 bg-primary/20 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-4 -left-4 w-72 h-72 bg-accent/20 rounded-full blur-3xl"></div>
                <div className="relative bg-card border border-border rounded-2xl p-8 shadow-2xl">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-lg">
                      <div className="bg-primary rounded-lg p-3">
                        <FileText className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">Automated Reports</div>
                        <div className="text-sm text-muted-foreground">One-click journal generation</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-accent/10 rounded-lg">
                      <div className="bg-accent rounded-lg p-3">
                        <Clock className="h-6 w-6 text-accent-foreground" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">DTR Monitoring</div>
                        <div className="text-sm text-muted-foreground">Time-stamped verification</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-lg">
                      <div className="bg-primary rounded-lg p-3">
                        <BarChart className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">Audit Trail</div>
                        <div className="text-sm text-muted-foreground">Data integrity assurance</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
              All-in-One Platform
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Built for Everyone
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              A comprehensive OJT tracking system connecting students, companies, and administrators
              in one seamless platform
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="group relative bg-card rounded-2xl p-8 border border-border hover:border-primary/50 transition-all hover:shadow-xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
              <div className="relative">
                <div className="bg-primary/10 rounded-xl p-4 w-fit mb-6 group-hover:scale-110 transition-transform">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-foreground">Automated Journal Generator</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Convert your daily task logs into official university-formatted reports with one click.
                </p>
                <div className="flex items-center text-primary font-medium text-sm">
                  Learn more <ArrowRight className="ml-1 h-4 w-4" />
                </div>
              </div>
            </div>

            <div className="group relative bg-card rounded-2xl p-8 border border-border hover:border-primary/50 transition-all hover:shadow-xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
              <div className="relative">
                <div className="bg-primary/10 rounded-xl p-4 w-fit mb-6 group-hover:scale-110 transition-transform">
                  <Clock className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-foreground">Real-time DTR & Attendance</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Securely log and monitor OJT hours with geolocated or time-stamped verification.
                </p>
                <div className="flex items-center text-primary font-medium text-sm">
                  Learn more <ArrowRight className="ml-1 h-4 w-4" />
                </div>
              </div>
            </div>

            <div className="group relative bg-card rounded-2xl p-8 border border-border hover:border-primary/50 transition-all hover:shadow-xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl group-hover:bg-accent/10 transition-colors"></div>
              <div className="relative">
                <div className="bg-accent/10 rounded-xl p-4 w-fit mb-6 group-hover:scale-110 transition-transform">
                  <FolderOpen className="h-8 w-8 text-accent-foreground" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-foreground">Administrative Audit Trail</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Ensuring data integrity for student accomplishments and supervisor evaluations.
                </p>
                <div className="flex items-center text-primary font-medium text-sm">
                  Learn more <ArrowRight className="ml-1 h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
                About PSU-Link
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                Institutional Compliance Made Simple
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                Designed specifically for Pampanga State University, Porac Campus, PSU-Link streamlines
                the entire OJT tracking and deployment process with comprehensive monitoring tools.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 rounded-lg p-2 mt-1">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Automated Documentation</h4>
                    <p className="text-muted-foreground">Generate compliant journals and reports instantly from logged activities</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 rounded-lg p-2 mt-1">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Real-Time Monitoring</h4>
                    <p className="text-muted-foreground">Track student progress and deployment status with live data analytics</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 rounded-lg p-2 mt-1">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Secure & Reliable</h4>
                    <p className="text-muted-foreground">Enterprise-grade security protecting institutional records</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-3xl"></div>
              <div className="relative bg-card border border-border rounded-3xl p-8 shadow-2xl">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-primary/5 rounded-2xl p-6 text-center">
                    <div className="text-4xl font-bold text-primary mb-2">1000+</div>
                    <div className="text-sm text-muted-foreground">Total Users</div>
                  </div>
                  <div className="bg-accent/10 rounded-2xl p-6 text-center">
                    <div className="text-4xl font-bold text-foreground mb-2">200+</div>
                    <div className="text-sm text-muted-foreground">Active Deployments</div>
                  </div>
                  <div className="bg-accent/10 rounded-2xl p-6 text-center">
                    <div className="text-4xl font-bold text-foreground mb-2">50+</div>
                    <div className="text-sm text-muted-foreground">Companies</div>
                  </div>
                  <div className="bg-primary/5 rounded-2xl p-6 text-center">
                    <div className="text-4xl font-bold text-primary mb-2">24/7</div>
                    <div className="text-sm text-muted-foreground">Support</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/80"></div>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 bg-accent rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary-foreground rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-6">
            Access Your OJT Portal
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-10 max-w-2xl mx-auto leading-relaxed">
            Join hundreds of students already using PSU-Link for streamlined OJT documentation.
            Access real-time monitoring, automated reports, and compliance tracking.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto text-lg px-8 py-6 group">
                Access Student Portal
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10 w-full sm:w-auto text-lg px-8 py-6">
              Contact Us
            </Button>
          </div>
          <div className="mt-12 flex items-center justify-center gap-8 text-primary-foreground/80">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>Free to use</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>Secure platform</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>24/7 support</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-primary rounded-lg p-2">
                  <GraduationCap className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold text-foreground">PSU-Link</span>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Streamlining OJT documentation and compliance tracking for Pampanga State University, Porac Campus
                BSIT students through automated monitoring and administrative tools.
              </p>
              <div className="flex items-center gap-4">
                <a href="#" className="bg-muted hover:bg-primary hover:text-primary-foreground rounded-lg p-2 transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="#" className="bg-muted hover:bg-primary hover:text-primary-foreground rounded-lg p-2 transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                </a>
                <a href="#" className="bg-muted hover:bg-primary hover:text-primary-foreground rounded-lg p-2 transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm4.441 16.892c-2.102.144-6.784.144-8.883 0C5.282 16.736 5.017 15.622 5 12c.017-3.629.285-4.736 2.558-4.892 2.099-.144 6.782-.144 8.883 0C18.718 7.264 18.982 8.378 19 12c-.018 3.629-.285 4.736-2.559 4.892zM10 9.658l4.917 2.338L10 14.342V9.658z"/></svg>
                </a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Quick Links</h4>
              <ul className="space-y-3">
                <li><a href="#home" className="text-muted-foreground hover:text-primary transition-colors">Home</a></li>
                <li><a href="#features" className="text-muted-foreground hover:text-primary transition-colors">Features</a></li>
                <li><a href="#about" className="text-muted-foreground hover:text-primary transition-colors">About</a></li>
                <li><Link to="/login" className="text-muted-foreground hover:text-primary transition-colors">Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Contact</h4>
              <ul className="space-y-3 text-muted-foreground">
                <li>Pampanga State University, Porac Campus</li>
                <li>Porac, Pampanga</li>
                <li className="text-primary hover:underline cursor-pointer">info@psu-link.edu.ph</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-muted-foreground text-sm">
              &copy; 2026 PSU-Link. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-primary transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}
