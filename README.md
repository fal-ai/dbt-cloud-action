# dbt Cloud action

This action lets you trigger a job run on [dbt Cloud](https://cloud.getdbt.com), fetches the `run_results.json` artifact, and `git checkout`s the branch that was ran by dbt Cloud.

### Inputs
  **Required**:
  - `dbt_cloud_token` - dbt Cloud [api token](https://docs.getdbt.com/docs/dbt-cloud/dbt-cloud-api/user-tokens)
  - `dbt_cloud_account_id` - dbt Cloud account id
  - `dbt_cloud_job_id` - dbt Cloud job id

We recommend passing sensitive variables as Github secrets. Example [here](https://github.com/fal-ai/fal_bike_example/blob/main/.github/workflows/fal_dbt.yml).

  **Optional**:
  - `cause` - Cause message to use [Default=`"Triggered by a GitHub Action"`]
  - `interval` - The interval between polls in seconds [Default=`30`]

### Example usage
```yaml
- uses: fal-ai/dbt-cloud-action@main
  id: dbt_cloud_run
  with:
      dbt_cloud_token: ${{ secrets.DBT_CLOUD_API_TOKEN }}
      dbt_cloud_account_id: ${{ secrets.DBT_ACCOUNT_ID }}
      dbt_cloud_job_id: ${{ secrets.DBT_JOB_ID }}
```
