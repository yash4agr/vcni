from typing import Dict, List, Optional
from dataclasses import dataclass, field
from enum import Enum


class DeviceType(str, Enum):
    LIGHT = "light"
    THERMOSTAT = "thermostat"
    LOCK = "lock"
    CAMERA = "camera"
    SWITCH = "switch"


@dataclass
class Device:
    """Represents a smart home device."""
    id: int
    name: str
    type: DeviceType
    status: bool = False
    value: int = 0  # Brightness for lights, temperature for thermostat, etc.
    color: Optional[str] = None  # For RGB lights

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type.value,
            "status": self.status,
            "value": self.value,
            "color": self.color,
        }


class IoTService:
    """Service for controlling smart home devices with persistent state."""

    # In-memory device state per user
    _user_devices: Dict[str, List[Device]] = {}

    # Default devices for new users
    DEFAULT_DEVICES = [
        Device(id=1, name="Living Room Lights", type=DeviceType.LIGHT, status=True, value=80),
        Device(id=2, name="Bedroom Lights", type=DeviceType.LIGHT, status=False, value=60),
        Device(id=3, name="Kitchen Lights", type=DeviceType.LIGHT, status=True, value=100),
        Device(id=4, name="Thermostat", type=DeviceType.THERMOSTAT, status=True, value=72),
        Device(id=5, name="Front Door Lock", type=DeviceType.LOCK, status=True, value=0),
        Device(id=6, name="Back Door Lock", type=DeviceType.LOCK, status=True, value=0),
        Device(id=7, name="Security Camera", type=DeviceType.CAMERA, status=True, value=0),
    ]

    def __init__(self, user_id: str = "default"):
        self.user_id = user_id

    def _get_devices(self) -> List[Device]:
        """Get or initialize devices for the current user."""
        if self.user_id not in IoTService._user_devices:
            # Create a copy of default devices for this user
            IoTService._user_devices[self.user_id] = [
                Device(
                    id=d.id,
                    name=d.name,
                    type=d.type,
                    status=d.status,
                    value=d.value,
                    color=d.color,
                )
                for d in self.DEFAULT_DEVICES
            ]
        return IoTService._user_devices[self.user_id]

    async def get_all_devices(self) -> dict:
        """Get all devices and their current states."""
        devices = self._get_devices()
        return {
            "devices": [d.to_dict() for d in devices],
        }

    async def control_device(
        self,
        device_name: Optional[str] = None,
        action: str = "toggle",
        value: Optional[int] = None,
        color: Optional[str] = None,
    ) -> dict:
        """
        Control a smart home device.
        
        Args:
            device_name: Name or partial name of the device
            action: 'on', 'off', 'toggle', 'set'
            value: Optional value to set (brightness, temperature)
            color: Optional color for RGB lights
            
        Returns:
            Updated device state and all devices for widget sync
        """
        devices = self._get_devices()
        
        # Find matching device(s)
        matched_devices = self._find_devices(devices, device_name)
        
        if not matched_devices:
            return {
                "error": True,
                "message": f"No device found matching '{device_name}'",
                "devices": [d.to_dict() for d in devices],
            }

        # Apply action to matched devices
        results = []
        for device in matched_devices:
            old_status = device.status
            
            if action == "on":
                device.status = True
            elif action == "off":
                device.status = False
            elif action == "toggle":
                device.status = not device.status
            elif action == "set":
                if value is not None:
                    device.value = value
                    device.status = True  # Turn on when setting value
                if color is not None:
                    device.color = color
                    device.status = True

            results.append({
                "device": device.name,
                "action": action,
                "old_status": old_status,
                "new_status": device.status,
                "value": device.value,
                "color": device.color,
            })

        return {
            "success": True,
            "results": results,
            "devices": [d.to_dict() for d in devices],
        }

    def _find_devices(
        self, devices: List[Device], name_pattern: Optional[str]
    ) -> List[Device]:
        """Find devices matching a name pattern."""
        if not name_pattern:
            # Return all lights if no pattern specified
            return [d for d in devices if d.type == DeviceType.LIGHT]

        pattern = name_pattern.lower()
        matched = []

        for device in devices:
            device_name = device.name.lower()
            device_type = device.type.value.lower()

            # Match by name or type
            if (
                pattern in device_name
                or pattern in device_type
                or pattern + "s" in device_type  # "light" -> "lights"
                or device_name in pattern
            ):
                matched.append(device)

        # Special handling for common phrases
        if not matched:
            if "all" in pattern:
                if "light" in pattern:
                    matched = [d for d in devices if d.type == DeviceType.LIGHT]
                else:
                    matched = devices
            elif "light" in pattern:
                matched = [d for d in devices if d.type == DeviceType.LIGHT]
            elif "lock" in pattern:
                matched = [d for d in devices if d.type == DeviceType.LOCK]

        return matched

    async def set_temperature(self, temperature: int) -> dict:
        """Set the thermostat temperature."""
        devices = self._get_devices()
        
        for device in devices:
            if device.type == DeviceType.THERMOSTAT:
                device.value = temperature
                device.status = True
                return {
                    "success": True,
                    "device": device.name,
                    "temperature": temperature,
                    "devices": [d.to_dict() for d in devices],
                }

        return {
            "error": True,
            "message": "No thermostat found",
            "devices": [d.to_dict() for d in devices],
        }

    def generate_response(self, result: dict, action: str, device_name: str) -> str:
        """Generate a natural language response for IoT actions."""
        if result.get("error"):
            return result.get("message", "I couldn't control that device.")

        results = result.get("results", [])
        if not results:
            return "Done! I've updated your smart home."

        if len(results) == 1:
            r = results[0]
            device = r.get("device", "device")
            status = "on" if r.get("new_status") else "off"
            return f"I've turned the {device} {status}."
        else:
            count = len(results)
            status = "on" if results[0].get("new_status") else "off"
            return f"I've turned {count} devices {status}."
