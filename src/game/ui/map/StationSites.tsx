import { BOARD, isStationSiteInUse, type BoardHex } from '../../map/board'
import { hexCenter, type Point } from '../../map/hexGrid'
import { MAX_PLAYERS, MIN_PLAYERS } from '../../rules/types'
import { COLORS, FONT_FAMILY, MAP_STYLE } from '../theme'
import { HEX_RADIUS } from './geometry'
import { PlaceGlyph, StationGlyph } from './glyphs'

// Printed station sites: a grey disc where a Station goes, ported from the asset
// generator's src/map/layers.jsx. A tile covers its site once built.

const SITES = BOARD.hexes.filter(hex => hex.stationSiteMinPlayers !== null)

const centerOf = (hex: BoardHex) => hexCenter(hex.col, hex.row, HEX_RADIUS)

/** "4+", or just "5" for a site only the largest game uses. */
const siteLabel = (minPlayers: number) => (minPlayers === MAX_PLAYERS ? `${minPlayers}` : `${minPlayers}+`)

function SiteLabel({ center, minPlayers }: { center: Point; minPlayers: number }) {
  const { radius, label } = MAP_STYLE.stationSite
  const labelY = center.y + radius
  return (
    <g>
      <rect
        x={center.x - label.width / 2}
        y={labelY - label.height / 2}
        width={label.width}
        height={label.height}
        rx={label.height / 2}
        fill={COLORS.ink}
      />
      <text
        x={center.x}
        y={labelY}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily={FONT_FAMILY}
        fontSize={label.fontSize}
        fontWeight={700}
        fill={COLORS.paper}
      >
        {siteLabel(minPlayers)}
      </text>
    </g>
  )
}

function StationSite({ center }: { center: Point }) {
  const { radius, glyphSize, strokeWidth } = MAP_STYLE.stationSite
  return (
    <g>
      <circle cx={center.x} cy={center.y} r={radius} fill={COLORS.slot} stroke={COLORS.rule} strokeWidth={strokeWidth} />
      <PlaceGlyph center={center} size={glyphSize}>
        <StationGlyph size={glyphSize} color={COLORS.inkFaint} />
      </PlaceGlyph>
    </g>
  )
}

/** In a game: only the sites in use at its player count, so none needs a label. */
export function StationSitesInUse({ playerCount }: { playerCount: number }) {
  return (
    <g>
      {SITES.filter(hex => isStationSiteInUse(hex, playerCount)).map(hex => (
        <StationSite key={hex.key} center={centerOf(hex)} />
      ))}
    </g>
  )
}

/** Every site, as printed on the board: those not used by every count say from how many players. */
export function PrintedStationSites() {
  return (
    <g>
      {SITES.map(hex => (
        <g key={hex.key}>
          <StationSite center={centerOf(hex)} />
          {hex.stationSiteMinPlayers !== null && hex.stationSiteMinPlayers > MIN_PLAYERS && (
            <SiteLabel center={centerOf(hex)} minPlayers={hex.stationSiteMinPlayers} />
          )}
        </g>
      ))}
    </g>
  )
}
