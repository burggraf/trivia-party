import { ArrowLeft, Download, Monitor, Tv } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '@/components/ui/AppHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import packageJson from '../../package.json'

const downloads = [
  {
    title: 'macOS',
    description: 'For Apple Silicon Macs (M1 or newer). Signed and notarized by Apple.',
    label: 'Download for macOS',
    href: '/downloads/trivia-party-display-macos-arm64.dmg',
    icon: Monitor,
  },
  {
    title: 'Android TV',
    description: 'Signed universal APK for Android TV and Fire TV devices.',
    label: 'Download Android TV APK',
    href: '/downloads/trivia-party-display-android-tv.apk',
    icon: Tv,
  },
]

export default function DownloadPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <AppHeader
        title="Display App Downloads"
        leftButton={
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} aria-label="Back to home">
            <ArrowLeft />
          </Button>
        }
      />

      <main className="p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 text-center md:mb-8">
            <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 md:text-3xl">
              Download Trivia Party Display
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 md:text-base">
              Version {packageJson.version} for a shared TV or projector screen.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
            {downloads.map(({ title, description, label, href, icon: Icon }) => (
              <Card key={title} className="dark:bg-slate-800 dark:border-slate-700">
                <CardHeader className="pb-3">
                  <Icon className="mb-2 h-8 w-8 text-slate-700 dark:text-slate-300" />
                  <CardTitle className="text-lg md:text-xl">{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="min-h-11" onClick={() => window.location.assign(href)}>
                    <Download />
                    {label}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mt-4 dark:bg-slate-800 dark:border-slate-700 md:mt-6">
            <CardContent className="p-4 text-sm text-slate-600 dark:text-slate-400 md:p-6 md:text-base">
              Android TV installation: enable developer mode, connect with <code>adb connect TV_IP:5555</code>, then run <code>adb install -r trivia-party-display-android-tv.apk</code>.
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
