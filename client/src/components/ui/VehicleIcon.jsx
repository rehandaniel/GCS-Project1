import { vehiclePath } from '../../lib/vehicle.js'

/** Siluet kendaraan dilihat dari atas, sesuai jenisnya ('plane', 'quad', 'rover', ...). Bentuknya ada di lib/vehicle.js. */
export const VehicleIcon = ({ kind, size = 24 }) => (
  <svg className="vehicle-icon" viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
    <path d={vehiclePath(kind)} fill="currentColor" />
  </svg>
)
