const axios = require('axios');
const core = require('@actions/core');
const fs = require('fs');
const axiosRetry = require('axios-retry');
const isNil = require('lodash.isnil')
const omitBy = require('lodash.omitby')

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

async function runJob(account_id, job_id, cause, overrides) {
  // NOTE: overrides['cause'] has priority over `cause` var
  let body = { cause, ...overrides }

  body = omitBy(body, isNil);

  core.debug(`Run job body:\n${JSON.stringify(body, null, 2)}`)

  let res = await dbt_cloud_api.post(`/accounts/${account_id}/jobs/${job_id}/run/`, body)
  return res.data;
}

async function getJobRun(account_id, run_id) {
  try {
    let res = await dbt_cloud_api.get(`/accounts/${account_id}/runs/${run_id}/?include_related=["run_steps"]`);
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
  const failure_on_error = core.getBooleanInput('failure_on_error');
  const cause = core.getInput('cause');
  const run_body = core.getInput('run_body') || {};

  // TODO: `git_sha` deprecated, can be removed later.
  const git_sha = core.getInput('git_sha') || null;
  if (git_sha) {
    run_body['git_sha'] = git_sha
  }

  const jobRun = await runJob(account_id, job_id, cause, run_body);
  const runId = jobRun.data.id;

  core.info(`Triggered job. ${jobRun.data.href}`);

  let res;
  while (true) {
    await sleep(core.getInput('interval') * 1000);
    res = await getJobRun(account_id, runId);

    if (!res) {
      // Retry if there is no response
      continue;
    }

    let status = run_status[res.data.status];
    core.info(`Run: ${res.data.id} - ${status}`);

    if (res.data.is_complete) {
      core.info(`job finished with '${status}'`);
      break;
    }
  }

  if (res.data.is_error && failure_on_error) {
    core.setFailed();
  }

  if (res.data.is_error) {
    // Wait for the step information to load in run
    core.info("Loading logs...")
    await sleep(5000);
    res = await getJobRun(account_id, runId);
    // Print logs
    for (let step of res.data.run_steps) {
      core.info("# " + step.name)
      core.info(step.logs)
      core.info("\n************\n")
    }
  }

  await getArtifacts(account_id, runId);

  return res.data['git_sha'];
}

async function main() {
  try {
    const git_sha = await executeAction();

    // GitHub Action output
    core.info(`dbt Cloud Job commit SHA is ${git_sha}`)
    core.setOutput('git_sha', git_sha);
  } catch (e) {
    // Always fail in this case because it is not a dbt error
    core.setFailed('There has been a problem with running your dbt cloud job:\n' + e.toString());
    core.debug(e.stack)
  }
}

main();
