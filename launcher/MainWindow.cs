namespace HarekCore;

using System;
using System.Drawing;
using System.IO;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

public class MainWindow : Form
{
    private readonly WebView2 webView;

    public MainWindow()
    {
        Text = "Harek Core - Микроядерная платформа";
        ClientSize = new Size(1360, 860);
        MinimumSize = new Size(960, 640);
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.FromArgb(9, 10, 15);
        AllowDrop = true;

        webView = new WebView2
        {
            Dock = DockStyle.Fill
        };

        Controls.Add(webView);
        Shown += async (s, e) => await InitializeWebViewAsync();
    }

    private async System.Threading.Tasks.Task InitializeWebViewAsync()
    {
        string userDataFolder = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "HarekCore",
            "WebView2"
        );
        Directory.CreateDirectory(userDataFolder);

        var env = await CoreWebView2Environment.CreateAsync(userDataFolder: userDataFolder);
        await webView.EnsureCoreWebView2Async(env);

        webView.CoreWebView2.Settings.AreDevToolsEnabled = true;
        webView.CoreWebView2.Settings.IsStatusBarEnabled = false;

        string baseDir = AppContext.BaseDirectory;
        string distPath = Path.Combine(baseDir, "dist");

        if (!Directory.Exists(distPath))
        {
            distPath = Path.Combine(baseDir, "..", "..", "..", "dist");
        }
        if (!Directory.Exists(distPath))
        {
            distPath = Path.Combine(baseDir, "..", "dist");
        }

        distPath = Path.GetFullPath(distPath);

        if (Directory.Exists(distPath))
        {
            webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                "harek.local",
                distPath,
                CoreWebView2HostResourceAccessKind.Allow
            );
            webView.Source = new Uri("https://harek.local/index.html");
        }
        else
        {
            webView.Source = new Uri("http://localhost:3000");
        }
    }
}
