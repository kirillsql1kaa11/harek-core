namespace HarekCore;

using System;
using System.Windows.Forms;

static class Program
{
    [STAThread]
    static void Main(string[] args)
    {
        ApplicationConfiguration.Initialize();
        Application.Run(new MainWindow());
    }
}
