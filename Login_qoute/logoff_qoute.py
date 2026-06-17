import os
import winreg
import random
import datetime


import ctypes

def refresh_legal_notice_caption():
    """
    Refreshes the Windows Shell (Explorer) so it reloads system settings, 
    fixing the OverflowError by passing the buffer object directly.
    """
    # 1. Define Windows API Constants
    HWND_BROADCAST = 0xFFFF
    WM_SETTINGCHANGE = 0x001A
    
    # Use "Environment" or another setting name related to system policies
    setting_type = "Environment" 
    setting_type_w = ctypes.create_unicode_buffer(setting_type)

    print("Attempting to broadcast WM_SETTINGCHANGE message to Windows Shell...")

    # 2. Call the SendMessageTimeout Windows API function
    # NOTE: The critical change is often simplifying the lParam argument.
    # We pass the ctypes buffer object directly.
    ctypes.windll.user32.SendMessageTimeoutW(
        HWND_BROADCAST,        # hWnd: Target window (Broadcast to all)
        WM_SETTINGCHANGE,      # Msg: WM_SETTINGCHANGE
        0,                     # wParam: (unused)
        # PASS THE BUFFER OBJECT DIRECTLY instead of using ctypes.addressof()
        setting_type_w,        # lParam: Pointer to the setting name
        0,                     # fuFlags: 0 (SMTO_NORMAL)
        5000,                  # uTimeout: Timeout in milliseconds (5 seconds)
        None                   # lpdwResult: Result pointer
    )
    
    print("WM_SETTINGCHANGE broadcast complete. The new legal notice should be applied.")

# --- Execute ---
# Place this directly after your winreg modification code
# refresh_legal_notice_caption()

def update_registry_string_from_file(file_path, key_path, value_name):
    """
    Reads the first line of a text file and uses it to set a REG_SZ value
    in the Windows Registry.

    Args:
        file_path (str): The full path to the text file containing the new string data.
        key_path (str): The relative path to the key (e.g., "Software\\MyAppKey").
        value_name (str): The name of the registry value to update.
    """
    try:
        # 1. Read the new string data from the file
        with open(file_path, 'r' , encoding="UTF-8") as f:
            new_data = f.readlines()

        if key_path == "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon" :
            new_data = new_data[random.randint(0 , len(new_data))]
        else:
            new_data = new_data[random.randint(0 , len(new_data))] + str(datetime.datetime.now())
            
        if not new_data:
            print(f"ERROR: File '{file_path}' is empty or could not be read.")
            return

        print(f"Data read from file: '{new_data}'")

        # 2. Specify the root key (e.g., HKEY_CURRENT_USER)
        # Change winreg.HKEY_CURRENT_USER to winreg.HKEY_LOCAL_MACHINE if needed
        # NOTE: HKLM requires running the script as Administrator!
        root_key = winreg.HKEY_LOCAL_MACHINE
        
        # 3. Open the key. KEY_SET_VALUE gives permission to write to the key.
        # winreg.KEY_WOW64_64KEY is often used to ensure the 64-bit view of the registry
        try:
            key_handle = winreg.OpenKey(
                root_key, 
                key_path, 
                0, 
                winreg.KEY_SET_VALUE | winreg.KEY_WOW64_64KEY
            )
        except FileNotFoundError:
            # If the key doesn't exist, create it (winreg.KEY_CREATE_SUB_KEY is needed)
            print(f"Registry key '{key_path}' not found. ")
            return 
            #key_handle = winreg.CreateKey(root_key, key_path)
            
        
        # 4. Set the value. REG_SZ is type 1.
        winreg.SetValueEx(
            key_handle, 
            value_name, 
            0, 
            winreg.REG_SZ, 
            new_data
        )
        
        # 5. Close the key handle
        winreg.CloseKey(key_handle)

        print(f"\nSUCCESS: Registry value '{value_name}' updated at '{root_key}\\{key_path}'")
        print(f"New data set to: '{new_data}'")

    except PermissionError:
        print("\nFATAL ERROR: Access is denied.")
        print("Please run the script with Administrator privileges, especially for HKEY_LOCAL_MACHINE keys.")
    except Exception as e:
        print(f"\nAn error occurred: {e}")

# --- Configuration ---
# Set the path to your data file
DATA_FILE = "c:\login_qoute\qoute.txt"

# Set the target Registry path and value name
# Example 1: Under the current user (e.g., HKCU\Software\PythonApp)
REG_KEY_PATH = "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System"
REG_VALUE_NAME = "legalnoticetext"

# Example 2: For a path that requires HKEY_LOCAL_MACHINE (HKLM)
# REG_KEY_PATH = "SYSTEM\\CurrentControlSet\\Services\\MyService" 

# --- Execute ---
update_registry_string_from_file(DATA_FILE, REG_KEY_PATH, REG_VALUE_NAME)

REG_KEY_PATH = "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon"
REG_VALUE_NAME = "legalnoticetext"

# Example 2: For a path that requires HKEY_LOCAL_MACHINE (HKLM)
# REG_KEY_PATH = "SYSTEM\\CurrentControlSet\\Services\\MyService" 

# --- Execute ---
update_registry_string_from_file(DATA_FILE, REG_KEY_PATH, REG_VALUE_NAME)
refresh_legal_notice_caption()