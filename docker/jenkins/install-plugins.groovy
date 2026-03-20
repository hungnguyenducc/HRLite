import jenkins.model.*
import hudson.model.*

def instance = Jenkins.getInstance()
def pm = instance.getPluginManager()
def uc = instance.getUpdateCenter()

def pluginsFile = new File('/usr/share/jenkins/ref/plugins.txt')
if (!pluginsFile.exists()) return

uc.updateAllSites()

def plugins = pluginsFile.text.trim().split('\n').collect { it.trim() }.findAll { it && !it.startsWith('#') }

def installed = false
plugins.each { name ->
    if (!pm.getPlugin(name)) {
        def plugin = uc.getPlugin(name)
        if (plugin) {
            plugin.deploy(true)
            installed = true
            println "Installing plugin: ${name}"
        } else {
            println "Plugin not found: ${name}"
        }
    }
}

if (installed) {
    instance.save()
    println "Plugins installed. Jenkins restart may be needed."
}
