# Fal dbt Cloud action

This action manages a job run on [dbt Cloud](https://cloud.getdbt.com), gets job artifacts and outputs git data for the successful job run.

### Inputs
  **Required**:
  - `dbt_cloud_token` - dbt Cloud [api token](https://docs.getdbt.com/docs/dbt-cloud/dbt-cloud-api/user-tokens)
  - `dbt_cloud_account_id` - dbt Cloud account id
  - `dbt_cloud_job_id` - dbt Cloud job id
  - `profiles` - contents of a [profiles.yml](https://docs.getdbt.com/reference/profiles.yml/) as a string
  - `keyfile` - Contents of a data warehouse keyfile

  **Optional**:
  - `cause` - Cause message to use [Default=`"Triggered by a GitHub Action"`]
  - `interval` - The interval between polls in seconds [Default=`30`]
  - `profile_name` - Name of target profile [Default=`default`]
  - `output_name` - Profile output [Default=`dev`]

### Example usage
```yaml
- uses: fal-ai/fal_dbt_cloud_action@v0.1
  id: dbt_cloud_run
  with:
      dbt_cloud_token: ${{ secrets.DBT_CLOUD_API_TOKEN }}
      dbt_cloud_account_id: ${{ secrets.DBT_ACCOUNT_ID }}
      dbt_cloud_job_id: ${{ secrets.DBT_JOB_ID }}
      profiles: ${{ secrets.PROFILES_YML }}
```
