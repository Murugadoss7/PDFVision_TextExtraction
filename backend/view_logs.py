#!/usr/bin/env python3

import os
import sys
from pathlib import Path
import time
from datetime import datetime

def clear_screen():
    """Clear terminal screen"""
    os.system('cls' if os.name == 'nt' else 'clear')

def view_log_file(filename, lines=50):
    """View last N lines of a log file"""
    log_path = Path("logs") / filename
    if not log_path.exists():
        print(f"❌ Log file {filename} does not exist yet")
        return
    
    print(f"📋 Last {lines} lines from {filename}:")
    print("=" * 80)
    
    try:
        with open(log_path, 'r', encoding='utf-8') as f:
            all_lines = f.readlines()
            last_lines = all_lines[-lines:] if len(all_lines) > lines else all_lines
            
            for line in last_lines:
                print(line.rstrip())
    except Exception as e:
        print(f"❌ Error reading {filename}: {e}")
    
    print("=" * 80)
    print()

def show_log_summary():
    """Show summary of all log files"""
    logs_dir = Path("logs")
    if not logs_dir.exists():
        print("❌ Logs directory doesn't exist yet. Start processing a document to generate logs.")
        return
    
    print("📊 LOG FILES SUMMARY:")
    print("-" * 60)
    
    log_files = [
        ("pipeline.log", "Main pipeline flow"),
        ("data_flow.log", "Data transformations"),
        ("database.log", "Database operations"),
        ("errors.log", "Errors and exceptions")
    ]
    
    for filename, description in log_files:
        log_path = logs_dir / filename
        if log_path.exists():
            stat = log_path.stat()
            size = stat.st_size
            modified = datetime.fromtimestamp(stat.st_mtime)
            
            size_str = f"{size:,} bytes"
            if size > 1024:
                size_str = f"{size/1024:.1f} KB"
            if size > 1024*1024:
                size_str = f"{size/(1024*1024):.1f} MB"
            
            print(f"✅ {filename:<15} - {description:<25} - {size_str:<10} - {modified.strftime('%H:%M:%S')}")
            
            # Count lines
            try:
                with open(log_path, 'r', encoding='utf-8') as f:
                    line_count = sum(1 for _ in f)
                print(f"   └── {line_count:,} lines")
            except:
                pass
        else:
            print(f"❌ {filename:<15} - {description:<25} - Not created yet")
    
    print("-" * 60)
    print()

def monitor_logs():
    """Monitor logs in real-time"""
    print("🔄 MONITORING LOGS IN REAL-TIME (Press Ctrl+C to stop)")
    print("Upload/process a document to see logs appear...")
    print()
    
    try:
        while True:
            clear_screen()
            print(f"⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            print()
            
            show_log_summary()
            
            # Show recent pipeline activity
            view_log_file("pipeline.log", 10)
            
            # Show recent errors if any
            errors_path = Path("logs/errors.log")
            if errors_path.exists() and errors_path.stat().st_size > 0:
                print("⚠️  RECENT ERRORS:")
                view_log_file("errors.log", 5)
            
            time.sleep(3)  # Refresh every 3 seconds
            
    except KeyboardInterrupt:
        print("\n✅ Monitoring stopped.")

def main():
    """Main menu"""
    while True:
        clear_screen()
        print("🔍 PDFVision Logging System Viewer")
        print("=" * 50)
        print()
        
        show_log_summary()
        
        print("MENU:")
        print("1. View pipeline log (main flow)")
        print("2. View data flow log (data transformations)")
        print("3. View database log (DB operations)")
        print("4. View errors log (errors & exceptions)")
        print("5. Monitor logs in real-time")
        print("6. View ALL recent activity")
        print("7. Clear all logs")
        print("0. Exit")
        print()
        
        choice = input("Enter choice (0-7): ").strip()
        
        if choice == "0":
            print("👋 Goodbye!")
            break
        elif choice == "1":
            clear_screen()
            view_log_file("pipeline.log", 100)
            input("\nPress Enter to continue...")
        elif choice == "2":
            clear_screen()
            view_log_file("data_flow.log", 100)
            input("\nPress Enter to continue...")
        elif choice == "3":
            clear_screen()
            view_log_file("database.log", 100)
            input("\nPress Enter to continue...")
        elif choice == "4":
            clear_screen()
            view_log_file("errors.log", 100)
            input("\nPress Enter to continue...")
        elif choice == "5":
            monitor_logs()
        elif choice == "6":
            clear_screen()
            print("📋 ALL RECENT ACTIVITY:")
            print()
            for filename in ["pipeline.log", "data_flow.log", "database.log", "errors.log"]:
                view_log_file(filename, 25)
            input("\nPress Enter to continue...")
        elif choice == "7":
            logs_dir = Path("logs")
            if logs_dir.exists():
                for log_file in logs_dir.glob("*.log"):
                    try:
                        log_file.unlink()
                        print(f"✅ Cleared {log_file.name}")
                    except Exception as e:
                        print(f"❌ Error clearing {log_file.name}: {e}")
                print("\n🧹 All logs cleared!")
            else:
                print("❌ No logs directory found.")
            input("\nPress Enter to continue...")
        else:
            print("❌ Invalid choice. Please try again.")
            time.sleep(1)

if __name__ == "__main__":
    main() 