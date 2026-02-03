# 如何将一个Maven工程的所有依赖同时发布到客户现场私服

## 背景

目前二次开发源码交付客户，并协助客户搭建开发环境的诉求越来越多。在客户现场搭建开发环境的难点就是需要在客户内网环境通过`maven`获取我们公司的依赖。

## 解决方案

根据客户现场的环境，如果没有`nexus`私服，则前置条件还需要帮助客户搭建一套私服。满足前置条件后，目前有两种解决方案。

方案一：`nexus`私服能够访问外网，只需进入`nexus`后台管理配置代理公司私服。此工作为一次性工作，需要联系框架部门将公司私服临时代理至外网。代理完成后在客户现场通过`maven`命令获取依赖，此时客户现场的`nexus`则会主动从拉取公司私服中获取所需的依赖并保存至本地仓库，以后每次重新获取优先从本地仓库获取。详见案例库：[中国印钞造币公司交易平台项目客户服务器内网构建个性化更新包](https://oa.epoint.com.cn/casebasecenter/frame/pages/alk/alkview/detail/alkcasedetail?rowguid=3950d542-34ce-4c6c-a007-1352ffce9fa8)

方案二：`nexus`私服不能访问外网，此时需要手动将所需依赖上传至私服。

## 手动上传(不推荐)

直接登录`nexus`后台上传

## maven命令发布

可以通过`maven-deploy-plugin`插件的`mvn deploy:deploy-file`方式发布

| 参数 | 参数说明 | 示例 |
| :--- | --- | --- |
| file | jar包所在路径 | 示例：`D:\7.1.50.2-SNAPSHOT\TPPingBiao.WebSDK-7.1.50.2-20221107.055107-66.jar`
| url | 需要发布私服的地址 | 示例：`http://admin:admin@192.168.220.235:8081/repository/dzjyrelease/`
| pomFile | jar包对应pom文件路径 | 示例：`D:\7.1.50.2-SNAPSHOT\TPPingBiao.WebSDK-7.1.50.2-20221107.055107-66.pom`
| package | settings.xml中配置的用户id | 一般为：`pom`或`jar`

### 示例

```shell
# 发布jar包
mvn deploy:deploy-file -s="C:\Users\naulu\.m2\settings.xml" -Dfile="D:\7.1.50.2-SNAPSHOT\TPPingBiao.WebSDK-7.1.50.2-20221107.055107-66.jar" -Durl="http://admin:admin@192.168.220.235:8081/repository/dzjyrelease/" -DpomFile="D:\7.1.50.2-SNAPSHOT\TPPingBiao.WebSDK-7.1.50.2-20221107.055107-66.pom" -Dpackage=jar
# 发布pom依赖
mvn deploy:deploy-file -s="C:\Users\naulu\.m2\settings.xml" -Dfile="D:\7.1.50.2-SNAPSHOT\ztb-parent-7.1.50.1.pom" -Durl="http://admin:admin@192.168.220.235:8081/repository/dzjyrelease/" -DpomFile="D:\7.1.50.2-SNAPSHOT\ztb-parent-7.1.50.1.pom" -Dpackage=pom
```

## 通过自定义插件发布

手动上传和maven命令操作起来仍比较麻烦，需要将一个`maven`工程的所有依赖都整理好之后才能上传。那么有没有什么方法可以直接获取到`maven`工程的所有依赖然后直接上传呢？

其实这两个功能都分别在`maven-dependency-plugin`和`maven-deploy-plugin`中实现了，通过`mvn dependency:tree`命令可以获取所有依赖，而`mvn deploy`则可以直接发布至私服，将两者组合一下就可以实现了。插件以发布，可以通过如下配置引用。具体发布版本可以查看gitlab：[multi-deploy-maven-plugin](http://192.168.0.200/lurj/multi-deploy-maven-plugin)

```xml
<build>
    <plugins>
        <plugin>
            <groupId>com.epoint.maven.plugins</groupId>
            <artifactId>multi-deploy-maven-plugin</artifactId>
            <version>1.0.x</version>
            <configuration>
                <includeGroupId>com.epoint.ztb</includeGroupId>
                <releaseUrl>http://admin:admin@192.168.220.235:8081/repository/dzjyrelease/</releaseUrl>
                <snapshotUrl>http://admin:admin@192.168.220.235:8081/repository/dzjysnapshot/</snapshotUrl>
            </configuration>
        </plugin>
    </plugins>
</build>
```

| 参数 | 参数说明 | 示例 |
| :--- | --- | --- |
| includeGroupId | 根据GroupId过滤 | 默认值为：`com.epoint.ztb`
| releaseUrl | 发布版发布的私服 | 示例：`http://admin:admin@192.168.220.235:8081/repository/dzjyrelease/`
| snapshotUrl | 快照版发布的私服 | 示例：`http://admin:admin@192.168.220.235:8081/repository/dzjysnapshot/`
| repositoryId | settings.xml中配置的用户id | 默认值为：`remote-repository`
| includeParents | 是否包含父依赖 | 默认值为：`true`
| outputLog | 是否输出日志 | 默认值为：`true`

```shell
# 使用此插件
mvn multi-deploy:multi-deploy
```

![1.png](./1.png)
