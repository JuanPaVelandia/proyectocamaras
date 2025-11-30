#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para probar el rendimiento del endpoint /api/discovery/scan optimizado
"""
import sys
import io
import requests
import time
import json

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

BASE_URL = "http://localhost:8001"

def test_scan(cidr: str, timeout_ms: int = 300, max_hosts: int = 128):
    """Ejecuta un scan y mide el tiempo"""
    payload = {
        "cidr": cidr,
        "timeout_ms": timeout_ms,
        "max_hosts": max_hosts
    }

    print(f"\n{'='*70}")
    print(f"🔍 Testing scan: {cidr} (timeout={timeout_ms}ms, max_hosts={max_hosts})")
    print(f"{'='*70}")

    start_time = time.time()
    try:
        response = requests.post(
            f"{BASE_URL}/api/discovery/scan",
            json=payload,
            timeout=120
        )
        duration = time.time() - start_time

        if response.status_code == 200:
            data = response.json()
            devices = data.get("devices", [])

            print(f"✅ Scan completed successfully!")
            print(f"⏱️  Total time: {duration:.2f}s")
            print(f"📊 Devices found: {len(devices)}")

            for device in devices:
                ip = device.get("ip")
                onvif = device.get("onvif_ports", [])
                rtsp = device.get("rtsp_ports", [])
                print(f"   • {ip}: ONVIF={onvif}, RTSP={rtsp}")

            # Calculate efficiency
            hosts_scanned = min(max_hosts, 254)  # Assuming /24 subnet
            avg_time_per_host = duration / hosts_scanned
            print(f"📈 Performance: {avg_time_per_host*1000:.1f}ms per host average")

        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)

    except Exception as e:
        duration = time.time() - start_time
        print(f"❌ Exception after {duration:.2f}s: {e}")

def main():
    print("\n" + "="*70)
    print("🚀 PERFORMANCE TEST - Optimized Discovery Scan")
    print("="*70)

    # Test 1: Small range (quick test)
    test_scan("192.168.1.0/29", timeout_ms=200, max_hosts=8)

    # Test 2: Medium range
    test_scan("192.168.1.0/27", timeout_ms=250, max_hosts=32)

    # Test 3: Large range (realistic scenario)
    test_scan("192.168.1.0/24", timeout_ms=300, max_hosts=128)

    print("\n" + "="*70)
    print("✅ All tests completed!")
    print("="*70 + "\n")

if __name__ == "__main__":
    main()
