const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

let chatUrlEndpoint = "";
let notifyOnlyMaster = "1";

admin.initializeApp();

exports.webhookBitbucketChat = functions.https.onRequest((req, res) => {
    let actor = req.body.actor;
    let eventType = req.header("X-Event-Key");
    
    console.log('Body of ' + eventType + ': ', req.body);

    setNotifyOnlyMaster(req);
    generateChatUrl(req);
    
    if (eventType.startsWith("pullrequest:")) {
        onPullRequestEvent(eventType, actor, req, res);
    } else if (eventType.startsWith("repo:")) {
        onRepoEvent(eventType, actor, req, res);
    } else {
        res.send("Ignored");
    }
})

function setNotifyOnlyMaster(req) {
    let onlyMaster = getQueryVariable("onlymaster", req.url);
    if (onlyMaster === "0") {
        notifyOnlyMaster = "0";
    } else {
        notifyOnlyMaster = "1";
    }
}

function generateChatUrl(req) {
    let chat = getQueryVariable("chat", req.url);
    let key = getQueryVariable("key", req.url);
    let token = getQueryVariable("token", req.url);

    chatUrlEndpoint = `https://chat.googleapis.com/v1/spaces/${chat}/messages?key=${key}&token=${token}`;
}

function getQueryVariable(variable, query) {
    query = query.slice(1);
    let vars = query.split(/[&?]/);
    // console.log('Query: ', vars);
    for (let i = 0; i < vars.length; i++) {
        let pair = vars[i].split('=');
        if (decodeURIComponent(pair[0]) === variable) {
            return decodeURIComponent(pair[1]);
        }
    }
}

function onRepoEvent(eventType, actor, req, res) {
    if (notifyOnlyMaster === "0" || !req.body.commit_status.refname.startsWith("develop")) {
        switch (eventType) {
            case 'repo:push':
                repoPush(actor, req, res);
                break;
            case 'repo:commit_comment_created':
                repoCommitCommentCreated(actor, req, res);
                break;
            case 'repo:commit_status_created':
                repoCommitStatusCreated(actor, req, res);
                break;
            case 'repo:commit_status_updated':
                repoCommitStatusUpdated(actor, req, res);
                break;
            default:
                res.send("Ignored");
        }
    } else {
        res.send("Ignored");
    }
}

function onPullRequestEvent(eventType, actor, req, res) {
    let pullRequest = req.body.pullrequest;
    switch (eventType) {
        case 'pullrequest:created':
            prCreated(pullRequest, actor, req, res);
            break;
        case 'pullrequest:updated':
            prUpdated(pullRequest, actor, req, res);
            break;
        case 'pullrequest:approved':
            prApproved(pullRequest, actor, req, res);
            break;
        case 'pullrequest:unapproved':
            prUnapproved(pullRequest, actor, req, res);
            break;
        case 'pullrequest:merged':
            prMerged(pullRequest, actor, req, res);
            break;
        case 'pullrequest:fulfilled':
            prFulfilled(pullRequest, actor, req, res);
            break;
        case 'pullrequest:rejected':
            prRejected(pullRequest, actor, req, res);
            break;
        case 'pullrequest:comment_created':
            prCommentCreated(pullRequest, actor, req, res);
            break;
        case 'pullrequest:comment_updated':
            prCommentUpdated(pullRequest, actor, req, res);
            break;
        case 'pullrequest:comment_deleted':
            prCommentDeleted(pullRequest, actor, req, res);
            break;
        default:
            res.send("Ignored");
    }
}

async function repoPush(actor, req, res){
    let repository = req.body.repository;
    let chat = req.query.chat;
    let commitHash = req.body.commit_status.commit.hash;
    let message = '';
    for (let change of req.body.push.changes) {
        console.log(change);
        for (let commit of change.commits) {
            message += `${actor.display_name.trim()} has <${commit.links.html.href}|commited>: ${commit.message}`;
        }
        if (change.truncated) {
            message += `${actor.display_name.trim()} has commited more things...\n`;
        }
    }
    await pushToGoogleChatThread(message, await getRepoThreadIdOrCreated(repository, chat, commitHash));
    return res.send('OK');
}

async function repoCommitCommentCreated(actor, req, res){
    let repository = req.body.repository;
    let chat = req.query.chat;
    let commitHash = req.body.commit_status.commit.hash;
    let commentText = req.body.comment.content.raw;
    let message = `${actor.display_name.trim()} has <${req.body.comment.links.html.href}|commented> about <${commit.links.html.href}|a commit>: ${commentText}`;
    await pushToGoogleChatThread(message, await getRepoThreadIdOrCreated(repository, chat, commitHash));
    return res.send('OK');
}

async function repoCommitStatusCreated(actor, req, res){
    let repository = req.body.repository;
    let chat = req.query.chat;
    let commitHash = req.body.commit_status.commit.hash;
    let message = await generateCommitStatusMessage(req);
    await pushToGoogleChatThread(message, await getRepoThreadIdOrCreated(repository, chat, commitHash));
    return res.send('OK');
}

async function repoCommitStatusUpdated(actor, req, res){
    let repository = req.body.repository;
    let chat = req.query.chat;
    let commitHash = req.body.commit_status.commit.hash;
    let message = await generateCommitStatusMessage(req);
    await pushToGoogleChatThread(message, await getRepoThreadIdOrCreated(repository, chat, commitHash));
    return res.send('OK');
}

async function generateCommitStatusMessage(req){
    let repository = req.body.repository;
    let commitStatus = req.body.commit_status;
    let type =  commitStatus.type.toUpperCase();
    let status = commitStatus.state.toUpperCase();
    
    if (status === 'INPROGRESS') {
        status = 'IN PROGRESS'
    }

    if (status === 'SUCCESSFUL') {
        status = 'SUCCESS'
    }

    let message = `<users/all> - *${commitStatus.name} - ${commitStatus.repository.full_name}*`
        + `\n*Follow up:* <${commitStatus.url}|${commitStatus.url}>`
        + `\n*Status:* ${type} - ${status}`
        + `\n*Branch:* ${commitStatus.refname}`
        + `\n*Repository:* <${repository.links.html.href}|${repository.name}>`
        + `\n*Author:* ${commitStatus.commit.author.user.display_name}`;
    
    return message;
}

async function prCreated(pullRequest, actor, req, res){
    await getPrThreadIdOrCreated(pullRequest, req);
    return res.send('OK');
}

async function prUpdated(pullRequest, actor, req, res){
    let message = `${actor.display_name.trim()} has updated this PR.`;
    await pushToGoogleChatThread(message, await getPrThreadIdOrCreated(pullRequest, req));
    return res.send('OK');
}

async function prApproved(pullRequest, actor, req, res){
    let message = `${actor.display_name.trim()} has approved this PR.`;
    await pushToGoogleChatThread(message, await getPrThreadIdOrCreated(pullRequest, req));
    return res.send('OK');
}

async function prUnapproved(pullRequest, actor, req, res){
    let message = `${actor.display_name.trim()} has unapproved this PR.`;
    await pushToGoogleChatThread(message, await getPrThreadIdOrCreated(pullRequest, req));
    return res.send('OK');
}

async function prMerged(pullRequest, actor, req, res){
    let message = `${actor.display_name.trim()} has merged this PR.`;
    await pushToGoogleChatThread(message, await getPrThreadIdOrCreated(pullRequest, req));
    return res.send('OK');
}

async function prFulfilled(pullRequest, actor, req, res){
    let message = `${actor.display_name.trim()} has merged this PR.`;
    await pushToGoogleChatThread(message, await getPrThreadIdOrCreated(pullRequest, req));
    return res.send('OK');
}

async function prRejected(pullRequest, actor, req, res){
    let message = `${actor.display_name.trim()} has rejected this PR.`;
    await pushToGoogleChatThread(message, await getPrThreadIdOrCreated(pullRequest, req));
    return res.send('OK');
}

async function prCommentCreated(pullRequest, actor, req, res){
    let commentText = req.body.comment.content.raw;
    let message = `${actor.display_name.trim()} <${req.body.comment.links.html.href}|commented>: ${commentText}`;
    console.log("prCommentCreated.message", message);
    await pushToGoogleChatThread(message, await getPrThreadIdOrCreated(pullRequest, req));
    return res.send('OK');
}

async function prCommentUpdated(pullRequest, actor, req, res){
    let commentText = req.body.comment.content.raw;
    let message = `${actor.display_name.trim()} has updated <${req.body.comment.links.html.href}|a comment>: ${commentText}`;
    await pushToGoogleChatThread(message, await getPrThreadIdOrCreated(pullRequest, req));
    return res.send('OK');
}

async function prCommentDeleted(pullRequest, actor, req, res){
    let message = `${actor.display_name.trim()} has deleted <${req.body.comment.links.html.href}|a comment>.`;
    await pushToGoogleChatThread(message, await getPrThreadIdOrCreated(pullRequest, req));
    return res.send('OK');
}

async function getRepoThreadIdOrCreated(repository, chat, commitHash) {
    let threadRef = `REPOSITORY_${repository.uuid}_${chat}_${commitHash}`;
    let threadId = await threadIdOf(threadRef);
    if (!threadId) {
        let message = `Changes on repository <${repository.links.html.href}|${repository.name}>`
            + `\n*Name:* ${repository.full_name}`
            + `\n*Link:* <${repository.links.html.href}|${repository.links.html.href}>`;
        threadId = await pushToGoogleChatThread(message).then(threadId => saveThreadId(threadRef, threadId));
    }
    return threadId;
}

async function getPrThreadIdOrCreated(pullRequest, req) {
    let threadRef = `PR_${pullRequest.links.html.href.split("/bitbucket.org/")[1]}_${req.query.chat}`;
    let threadId = await threadIdOf(threadRef);
    if (!threadId) {
        let repository = req.body.repository;
        let message = `<users/all> - *New Pull Request - ${repository.full_name}*`
            + `\n*Link:* <${pullRequest.links.html.href}|${pullRequest.links.html.href}>`
            + `\n*Title:* ${pullRequest.title.trim()}`
            + `\n*Branch:* ${pullRequest.source.branch.name.trim()} >>> ${pullRequest.destination.branch.name.trim()}`
            + `\n*Repository:* <${repository.links.html.href}|${repository.name}>`
            + `\n*Author:* ${pullRequest.author.display_name.trim()}`;
        threadId = await pushToGoogleChatThread(message).then(threadId => saveThreadId(threadRef, threadId));
    }
    return threadId;
}

async function threadIdOf(threadRef) {
    return admin.database().ref('chatThread').child(threadRef).child('threadId')
        .once('value')
        .then((snapshot) => snapshot.val());
}

async function saveThreadId(threadRef, threadId) {
    return await admin.database().ref('chatThread').child(threadRef).set({
        threadId: threadId.toString()
    });
}

async function pushToGoogleChatThread(message, thread = null) {
    let googleRes = await axios.post(chatUrlEndpoint, {
        text: message,
        thread: {
            name: thread
        }
    }).catch((e)=>{console.log(e)});
    chatUrlEndpoint = "";
    return googleRes.data.thread.name;
}
