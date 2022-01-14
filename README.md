# Fal dbt Cloud action

This action manages a job run on [dbt Cloud](https://cloud.getdbt.com), gets job artifacts and outputs git data for the successful job run.

### Inputs
  **Required**:
  - `dbt_cloud_token` - dbt Cloud [api token](https://docs.getdbt.com/docs/dbt-cloud/dbt-cloud-api/user-tokens)
  - `dbt_cloud_account_id` - dbt Cloud account id
  - `dbt_cloud_job_id` - dbt Cloud job id

  **Optional**:
  - `cause` - Cause message to use. [Default=`"Triggered by a GitHub Action"`]
  - `interval` - The interval between polls in seconds. [Default=`30`]

### Outputs
    - `git_branch` - git branch name for the successful job run
    - `git_sha` - git commit SHA for the successful job run

### Example usage
```yaml
- uses: fal-ai/fal_dbt_cloud_action@v0.1
  id: dbt_cloud_run
  with:
      dbt_cloud_token: ${{ secrets.DBT_CLOUD_API_TOKEN }}
      dbt_cloud_account_id: ${{ secrets.DBT_ACCOUNT_ID }}
      dbt_cloud_job_id: ${{ secrets.DBT_JOB_ID }}
```
