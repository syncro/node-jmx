var java = require('java'),
    EventEmitter = require('events').EventEmitter,
    util = require('util'),
    javaRemote = require('./javaRemote'),
    javaReflection = require('./javaReflection');

module.exports = JavaJmx;

function JavaJmx(serviceOrHost, port, protocol, urlPath) {
  EventEmitter.call(this);
  this.jmxConnector = null
  this.mbeanServerConnection = null
}
util.inherits(JavaJmx, EventEmitter);

JavaJmx.prototype.JmxServiceUrl = function(serviceOrHost, port, protocol, urlPath) {
  return javaRemote.JMXServiceURL(serviceOrHost, port, protocol, urlPath);
}

JavaJmx.prototype.connect = function(jmxServiceUrl) {
  if (this.jmxConnector === null) {
    var map = java.newInstanceSync("java.util.HashMap");
    var JMXConnectorFactory = java.import("javax.management.remote.JMXConnectorFactory");
    this.jmxConnector = JMXConnectorFactory.connectSync(jmxServiceUrl, map);
  }
  if (this.mbeanServerConnection == null) {
    this.mbeanServerConnection = this.jmxConnector.getMBeanServerConnectionSync();
  }
}

JavaJmx.prototype.disconnect = function() {
  this.mbeanServerConnection = null;
  if (this.jmxConnector !== null) {
    this.jmxConnector.closeSync();
    this.jmxConnector = null;
  }
}

// we need reflection to call setAccessible() and avoid the Reflection.ensureMemberAccess exception
JavaJmx.prototype.read = function(mbean, attributeName, callback) {
  var instances = this.mbeanServerConnection.queryMBeansSync(null, java.newInstanceSync("javax.management.ObjectName", mbean));
  instancesAr = instances.toArraySync();
  for (var i = 0, instance = instancesAr[i]; i < instancesAr.length; i++) {
    var method = "getAttribute";
    var paramsClass = [ "javax.management.ObjectName", "java.lang.String" ];
    var params = [instance.getObjectNameSync(), attributeName];
    javaReflection.invokeMethod(this.mbeanServerConnection, method, paramsClass, params, function(attrObject) {
      callback(attrObject);
    });
  }
}

JavaJmx.prototype.write = function(mbean, attributeName, value, callback) {
  var attribute = java.newInstanceSync("javax.management.Attribute", attributeName, value);
  var instances = this.mbeanServerConnection.queryMBeansSync(null, java.newInstanceSync("javax.management.ObjectName", mbean));
  instancesAr = instances.toArraySync();
  for (var i = 0, instance = instancesAr[i]; i < instancesAr.length; i++) {
    var method = "setAttribute";
    var paramsClass = [ "javax.management.ObjectName", "javax.management.Attribute" ];
    var params = [instance.getObjectNameSync(), attribute];
    javaReflection.invokeMethod(this.mbeanServerConnection, method, paramsClass, params, function(attrObject) {
      if (callback) {
        callback(attrObject);
      }
    });
  }
}
