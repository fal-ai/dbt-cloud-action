# Fal dbt Cloud action

This action manages a job run on [dbt Cloud](https://cloud.getdbt.com) and get job artifacts.

### Inputs.
  > **Required**:
  > - dbt_cloud_token - DBT cloud api token.
  > - dbt_cloud_account_id - DBT cloud account id.
  > - dbt_cloud_job_id - DBT cloud job id.
  
  > **Optional**:
  > - cause - Cause message to use. [Default=`"Triggered from Github"`].
  > - interval - The interval between polls in seconds. [Default=`30`].

### Example usage.
```yaml
uses: fal-ai/fal_dbt_cloud
with:
  dbt_cloud_token: '${{ secrets.DBT_CLOUD_API_TOKEN }}'.
  dbt_cloud_account_id: ${{ secrets.DBT_ACCOUNT_ID }}
  dbt_cloud_job_id: 00000 # id of job you want to run.
  cause: 'Tiggered from my action'
  interval: 30
```
