interface BluetoothCharacteristicProperties {
  readonly write: boolean
  readonly writeWithoutResponse: boolean
}

interface BluetoothRemoteGATTCharacteristic {
  readonly uuid: string
  readonly properties: BluetoothCharacteristicProperties
  readonly value?: DataView
  writeValue(value: BufferSource): Promise<void>
  writeValueWithResponse(value: BufferSource): Promise<void>
  writeValueWithoutResponse(value: BufferSource): Promise<void>
}

interface BluetoothRemoteGATTService {
  readonly uuid: string
  getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>
  getCharacteristics(characteristic?: string): Promise<BluetoothRemoteGATTCharacteristic[]>
}

interface BluetoothRemoteGATTServer {
  readonly connected: boolean
  connect(): Promise<BluetoothRemoteGATTServer>
  disconnect(): void
  getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>
  getPrimaryServices(service?: string): Promise<BluetoothRemoteGATTService[]>
}

interface BluetoothDevice {
  readonly name?: string
  readonly gatt?: BluetoothRemoteGATTServer
  addEventListener(type: "gattserverdisconnected", listener: () => void): void
  removeEventListener(type: "gattserverdisconnected", listener: () => void): void
}

interface BluetoothLEScanFilter {
  services?: string[]
  name?: string
  namePrefix?: string
}

interface BluetoothRequestDeviceOptions {
  filters?: BluetoothLEScanFilter[]
  optionalServices?: string[]
  acceptAllDevices?: boolean
}

interface Bluetooth {
  requestDevice(options?: BluetoothRequestDeviceOptions): Promise<BluetoothDevice>
}

interface Navigator {
  bluetooth: Bluetooth
}