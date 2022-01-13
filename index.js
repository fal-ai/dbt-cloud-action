const axios = require('axios')
const core = require('@actions/core');
const github = require('@actions/github');
const { exec } = require("child_process");
const fs = require('fs');

const run_status = {
  1: 'Queued',
  2: 'Starting',
  3: 'Running',
  10: 'Success',
  20: 'Error',
  30: 'Cancelled'
}

const dbt_cloud_api = axios.create({
  baseURL: 'https://cloud.getdbt.com/api/v2/',
  timeout: 1000,
  headers: {
    'Authorization': `Token ${core.getInput('dbt_cloud_token')}`,
    'Content-Type': 'application/json'
  }
});

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function runJob(account_id, job_id, cause) {
  res = await dbt_cloud_api.post(`/accounts/${account_id}/jobs/${job_id}/run/`, {
    cause: cause
  })
  return res.data
}

async function getJobRun(account_id, run_id) {
  res = await dbt_cloud_api.get(`/accounts/${account_id}/runs/${run_id}/`)
  return res.data
}


async function getArtifacts(account_id, run_id) {
  res = await dbt_cloud_api.get(`/accounts/${account_id}/runs/${run_id}/artifacts/run_results.json`);
  run_results = res.data;

  const dir = './target';

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  fs.writeFileSync(`${dir}/run_results.json`, JSON.stringify(run_results))
}


function checkoutTargetBranch(runData) {
  core.info(`Checking out ${runData['git_branch']} ${runData['git_sha']}`)
  const command = `git checkout ${runData['git_branch']} ${runData['git_sha']}`
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(`error: ${error.message}`)
      }
      if (stderr) {
        reject(`error: ${stderr}`)
      }
      core.info(`stdout: ${stdout}`)
      resolve();
    });
  })
}


async function executeAction() {

  const account_id=core.getInput('dbt_cloud_account_id');
  const job_id=core.getInput('dbt_cloud_job_id');
  const cause=core.getInput('message');

  let res = await runJob(account_id, job_id, cause);
  let run_id = res.data.id;
  
  core.info(`Triggered job. ${res.data.href}`);

  while (true) {
    await sleep(core.getInput('interval') * 1000);
    let res = await getJobRun(account_id, run_id);
    let run = res.data;

    core.info(`Run: ${run.id} - ${run_status[run.status]}`);

    if (run.finished_at) {
      core.info('job finished');

      let status = run_status[run.status];

      if (status != 'Success') {
        core.setFailed(`job finished with '${status}'.`);
        return;
      }

      core.info(`job finished with '${status}'.`);
      await checkoutTargetBranch(run)
      await getArtifacts(account_id, run_id)
      return `job finished with '${status}'.`;
    }
  }
}

executeAction().catch(e => {
  core.setFailed('There has been a problem with running your dbt cloud job: ' + e.message);
});
