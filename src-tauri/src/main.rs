// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Installer subcommands (configure autologon reads the password from stdin,
    // never the command line), then exit without launching the GUI.
    match std::env::args().nth(1).as_deref() {
        Some("configure-autologon") => {
            nonios_lib::autologon_cli();
            return;
        }
        Some("disable-autologon") => {
            nonios_lib::autologon_disable_cli();
            return;
        }
        Some("restore-shell") => {
            nonios_lib::restore_shell_cli();
            return;
        }
        _ => {}
    }

    nonios_lib::run()
}
