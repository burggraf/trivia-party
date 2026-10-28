import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import type { PlayMode } from '@/hooks/useControllerSettings'

interface ControllerSettingsProps {
  playMode: PlayMode
  onPlayModeChange: (mode: PlayMode) => void
  showQrCode: boolean
  showJoinLink: boolean
  onToggleQrCode: () => void
  onToggleJoinLink: () => void
}

export default function ControllerSettings({
  playMode,
  onPlayModeChange,
  showQrCode,
  showJoinLink,
  onToggleQrCode,
  onToggleJoinLink
}: ControllerSettingsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-[44px] w-[44px]"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Play Mode</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={playMode} onValueChange={(value) => {
          if (value === 'player' || value === 'host-only') onPlayModeChange(value)
        }}>
          <DropdownMenuRadioItem value="player" className="min-h-[44px]">Player</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="host-only" className="min-h-[44px]">Host Only</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault()
            onToggleQrCode()
          }}
          className="flex items-center justify-between"
        >
          <Label htmlFor="qr-toggle" className="cursor-pointer">
            Show QR Code
          </Label>
          <Switch
            id="qr-toggle"
            checked={showQrCode}
            onCheckedChange={onToggleQrCode}
          />
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault()
            onToggleJoinLink()
          }}
          className="flex items-center justify-between"
        >
          <Label htmlFor="link-toggle" className="cursor-pointer">
            Show Join Link
          </Label>
          <Switch
            id="link-toggle"
            checked={showJoinLink}
            onCheckedChange={onToggleJoinLink}
          />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
