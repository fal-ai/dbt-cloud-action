const axios = require('axios');
const core = require('@actions/core');
const fs = require('fs');
const axiosRetry = require('axios-retry');

axiosRetry(axios, {
  retryDelay: (retryCount) => retryCount * 1000,
  retries: 3,
  shouldResetTimeout: true,
  onRetry: (retryCount, error, requestConfig) => {
    console.error("Error in request. Retrying...")
  }
});

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
  timeout: 5000, // 5 seconds
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

async function runJob(account_id, job_id, cause, git_sha) {
  let body = { cause: cause }

  if (git_sha) {
    body['git_sha'] = git_sha
  }

  let res = await dbt_cloud_api.post(`/accounts/${account_id}/jobs/${job_id}/run/`, body)
  return res.data;
}

async function getJobRun(account_id, run_id) {
  try {
    let res = await dbt_cloud_api.get(`/accounts/${account_id}/runs/${run_id}/`);
    return res.data;
  } catch (e) {
    let errorMsg = e.toString()
    if (errorMsg.search("timeout of ") != -1 && errorMsg.search(" exceeded") != -1) {
      // Special case for axios timeout
      errorMsg += ". The dbt Cloud API is taking too long to respond."
    }

    console.error("Error getting job information from dbt Cloud. " + errorMsg);
  }
}

async function getArtifacts(account_id, run_id) {
  let res = await dbt_cloud_api.get(`/accounts/${account_id}/runs/${run_id}/artifacts/run_results.json`);
  let run_results = res.data;

  core.info('Saving artifacts in target directory')
  const dir = './target';

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  fs.writeFileSync(`${dir}/run_results.json`, JSON.stringify(run_results));
}


async function executeAction() {

  const account_id = core.getInput('dbt_cloud_account_id');
  const job_id = core.getInput('dbt_cloud_job_id');
  const cause = core.getInput('cause');
  const git_sha = core.getInput('git_sha') || null;

  let res = await runJob(account_id, job_id, cause, git_sha);
  let run_id = res.data.id;

  core.info(`Triggered job. ${res.data.href}`);

  while (true) {
    await sleep(core.getInput('interval') * 1000);
    let res = await getJobRun(account_id, run_id);
    if (!res) {
      // Restart loop if there is no response
      continue;
    }

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
      await getArtifacts(account_id, run_id);

      return run['git_sha'];
    }
  }
}

async function main() {
  try {
    const git_sha = await executeAction();

    // GitHub Action output
    core.info(`dbt Cloud Job commit SHA is ${git_sha}`)
    core.setOutput('git_sha', git_sha);
  } catch (e) {
    core.setFailed('There has been a problem with running your dbt cloud job:\n' + e.toString());
  }
}

main();
